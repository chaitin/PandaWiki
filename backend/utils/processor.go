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

func (t *ProcessorTree) Add(farther *Node, data []byte) (*Node, error) {
	if farther == nil {
		return nil, errors.New("farther is nil")
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	temp := newNode()
	farther.son = append(farther.son, temp)
	temp.buf.Write(data)
	return temp, nil
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
