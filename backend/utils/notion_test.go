package utils

import (
	"context"
	"fmt"
	"testing"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

func TestList(t *testing.T) {
	cfg, _ := config.NewConfig()
	c := NewNotionClient("integration", log.NewLogger(cfg), "default", nil)
	L, err := c.GetList(t.Context(), "")
	if err != nil {
		t.Error(err)
	}
	for _, v := range L {
		t.Log(v.Id, v.Title)
	}
	var req domain.PageInfo
	req.Id = "id"
	res, err := c.GetPageContent(context.Background(), req)
	if err != nil {
		t.Error(err)
	}
	t.Log(res.Content)
}

func TestUploadImage(t *testing.T) {
	url := "https://prod-files-secure.s3.us-west-2.amazonaws.com/17cdcd89-82be-41b4-8b8b-a859ed8c0686/7a1fcf1a-2ce1-425d-a74f-102908ebeab9/%E6%88%AA%E5%B1%8F2025-06-11_12.10.11.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466UAMEGIA3%2F20250613%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250613T063745Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECcaCXVzLXdlc3QtMiJGMEQCIHHG4OaTeGr0ZBL65MKTNwvy8wlA4Qxfc7y6kpbW47biAiBp8vqeeDDru0nmjjK5nbKg3IAeYxtL%2BDNfM67sDn%2FD4Cr%2FAwgQEAAaDDYzNzQyMzE4MzgwNSIMYeZAGmxpZsK28ZDBKtwD%2FxLMRgiWWREJ9TxRD7PacInw5dwZucC9Pke1vKDDt6HtBLNX0BRokLi%2BFzv2dAT3qH80O7s7xnw%2B7lWdym65Uah8MmpSPmFshw%2F3NZxUjoc4T4T5mBVbA%2BrsHq5auQSSwwn8ckOmNIrwrx4JYMlwNiPyKkLHRnTEbDJDDpX8WaZ2ukxAYMJmGTS4S%2BD0rxrqOtxAdFTR3buQd2m%2FkD%2F5ghFnypWLe%2BwxiYHPkd9uSd0%2B05KOPL53YPrJg%2FoZlSjggjXsYGy9UWfRkaX571bWrRDDFtBMiilyfchCEwYZ49NAnMhnq4owXkXOsBLAk%2FiwXeIpgMOKCgd3rdXxs2ICM4fI7AykUAXiBETbNX2nBh1iuNHoxY0f3gNSBaq3iFSI6qWiRI%2FzuRln0PTerdYcPRxWx4KdBj770QRAdRc7XLH9qtPbJHXXKZvqZ7ihruLMNcONaMEkr3%2BIL91P%2FtDy3%2BAVwLViWmTIrRCOn5wSQf1N4PUlQgKjs1p%2Fx76CgAwQEDT22%2BgK5sGJcWOSrmdFJcW0PcV0joNCZHaPJbEp%2BIVNzfoa8k2IZro8BMjwBK7muM2cjGjgr8aC0uY1MmII1Fidaa0eC0nW4sN6cEn07YmbRvZf9EedTF6cmgcww42vwgY6pgEiXRH10GK%2BMrx1pPTJma75RZ6GwgWgB%2FXR%2FWHg0tiy4HtH2lbhf709mmRz4YBcPbK0ddzdnU8YoweH5FAqhxh1WqB%2FWnJYrwKfpDgg8q%2Fpk6ARoh%2FNEOGIKndKRPGhW2XFCLjaGiZ0iUSOdZgqtycirrXjkmfQg6PUz47tw4xmlxPSRq7d8TXExMkh8teGSeVc9dQNYe%2FcG3el1QnftL5adwdf5yJc&X-Amz-Signature=08112c2119a9e04f6c0e4379303d115e8ba6b86149874973d90727d643ebd580&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"
	cfg, _ := config.NewConfig()
	c := NewNotionClient("integration", log.NewLogger(cfg), "default", nil)
	res, err := c.UploadImage(context.Background(), url, "Aaaaa")
	if err != nil {
		t.Error(err)
	}
	fmt.Println(res)

}
