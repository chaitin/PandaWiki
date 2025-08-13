package utils

import (
	"errors"
	"sync"
)

var (
	dfaInstance map[string]*DFAInstance
	mu          sync.RWMutex
)

type DFAInstance struct {
	DFA      *DFA
	BuffSize int
}

// GetDFA returns the singleton instance of DFA
func GetDFA(kbID string) *DFAInstance {
	mu.RLock()
	defer mu.RUnlock()
	return dfaInstance[kbID]
}

// InitDFA Initialize a new DFA. --> this func used by pro
func InitDFA(kbID string, words []string) {
	mu.Lock()
	defer mu.Unlock()
	newDFA := &DFA{
		Root: NewTrieNode(),
	}
	var BuffSize int // 默认为0
	for _, word := range words {
		newDFA.AddWord(word)
		if BuffSize < len([]rune(word)) {
			BuffSize = len([]rune(word))
		}
	}
	if dfaInstance == nil {
		dfaInstance = make(map[string]*DFAInstance)
	}
	dfaInstance[kbID] = &DFAInstance{
		DFA:      newDFA,
		BuffSize: BuffSize,
	}
}

// TrieNode Define the nodes of DFA
type TrieNode struct {
	Children map[rune]*TrieNode
	IsEnd    bool
}

// NewTrieNode Create a new Trie node
func NewTrieNode() *TrieNode {
	return &TrieNode{
		Children: make(map[rune]*TrieNode),
		IsEnd:    false,
	}
}

// DFA The structure contains the root node of the DFA
type DFA struct {
	Root *TrieNode
}

// AddWord Add sensitive words to DFA
func (d *DFA) AddWord(word string) {
	node := d.Root
	for _, char := range word {
		if _, exists := node.Children[char]; !exists {
			node.Children[char] = NewTrieNode()
		}
		node = node.Children[char]
	}
	node.IsEnd = true
}

// UpdateOldWord update old word
func (d *DFA) UpdateOldWord(oldWord, newWord string) {
	d.DeleteWord(oldWord)
	d.AddWord(newWord)
}

// DeleteWord delete word
func (d *DFA) DeleteWord(word string) bool {
	result := []rune(word)
	// 辅助函数用于递归删除节点
	var deleteNode func(node *TrieNode, index int) bool
	deleteNode = func(node *TrieNode, index int) bool {
		if index == len(result) {
			// 如果该词不存在，直接返回
			if !node.IsEnd {
				return false
			}
			// 清除该词的结束标记
			node.IsEnd = false
			// 如果该节点没有子节点，可以删除
			return len(node.Children) == 0
		}

		char := result[index]
		child, exists := node.Children[char]
		if !exists {
			return false // 如果路径不存在，则不做任何操作
		}

		// 递归删除子节点
		shouldDeleteChild := deleteNode(child, index+1)
		if shouldDeleteChild {
			// 删除当前节点的子节点
			delete(node.Children, char)
			// 如果当前节点没有其他子节点且不是词尾节点，返回 true
			return len(node.Children) == 0 && !node.IsEnd
		}
		return false
	}

	// 调用递归函数删除指定的词
	return deleteNode(d.Root, 0)
}

// DeleteWordBatch delete word batch
func (d *DFA) DeleteWordBatch(words []string) {
	wg := sync.WaitGroup{}
	for _, word := range words {
		wg.Add(1)
		go func() {
			d.DeleteWord(word)
			wg.Done()
		}()
	}
	wg.Wait()
}

// Filter the input text and replace sensitive words
func (d *DFA) Filter(text string) string {
	result := []rune(text)             // 转化为rune
	for i := 0; i < len(result); i++ { // 外层循环，遍历每个字符作为起始点
		node := d.Root
		j := i
		for j < len(result) { // 内层循环，尝试匹配敏感词
			if nextNode, exists := node.Children[result[j]]; exists { // 如果当前字符在子节点中存在
				node = nextNode // 下移
				if node.IsEnd { // 是否为结尾，即匹配到敏感词，替换为*
					for k := i; k <= j; k++ {
						result[k] = '🚫'
					}
				}
				j++ // next char
			} else {
				break
			}
		}
	}
	return string(result)
}

// Check  if the input text contains sensitive words
func (d *DFA) Check(text string) error {
	result := []rune(text)
	for i := 0; i < len(result); {
		node := d.Root
		start := i
		matched := false
		for j := i; j < len(result); j++ {
			char := result[j]
			if nextNode, exists := node.Children[char]; exists {
				node = nextNode
				if node.IsEnd {
					return errors.New("包含敏感词: " + string(result[start:j+1]))
				}
			} else {
				break
			}
		}
		if !matched {
			i++
		}
	}
	return nil
}
