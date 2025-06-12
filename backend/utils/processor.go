package utils

import (
	"bytes"
	"errors"
	"io"
	"sync"
)

type Node struct {
	buf *bytes.Buffer
	son []*Node
}

func newNode() *Node {
	return &Node{son: []*Node{}, buf: bytes.NewBufferString("")}
}

type ProcessorTree struct {
	mu     *sync.Mutex
	root   *Node
	result *bytes.Buffer
	wg     *sync.WaitGroup
}

func NewProcessorTree() *ProcessorTree {
	return &ProcessorTree{
		root:   newNode(),
		mu:     &sync.Mutex{},
		result: bytes.NewBufferString(""),
		wg:     &sync.WaitGroup{},
	}
}

// 获取一个father下的节点
func (t *ProcessorTree) GetNode(farther *Node) (*Node, error) {
	if farther == nil {
		return nil, errors.New("father is nil")
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	temp := newNode()
	farther.son = append(farther.son, temp)
	return temp, nil
}
func (t *ProcessorTree) Add(node *Node, data []byte) error {
	if node == nil {
		return errors.New("node is nil")
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	node.buf.Write(data)
	return nil
}

func (t *ProcessorTree) GetResult() []byte {
	t.getRes(t.root)
	return t.result.Bytes()
}
func (t *ProcessorTree) getRes(node *Node) {
	if node == nil {
		return
	}
	io.Copy(t.result, node.buf)
	t.result.Write(node.buf.Bytes())
	for _, son := range node.son {
		t.getRes(son)
	}
}
