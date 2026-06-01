package main

import (
	"bufio"
	"context"
	"fmt"
	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
	"log"
	"os"
	"strings"
)

// implement Logger for MakeJupyterSession
type Logger struct{}

func (_ Logger) Log(s string) {
	fmt.Println(s)
}

func main() {
	sys := jupyterclient.DefaultSystemServiceSettings()
	jup, err := jupyterclient.DefaultJupyterServiceSettings(sys)
	if err != nil {
		log.Fatal(err)
	}
	jc := jupyterclient.MakeJupyterHttpClient(jup)

	kernel, err := jc.SelectKernel()
	if err != nil {
		log.Fatal(err)
	}

	ci, err := jc.GetConnectionInfo(kernel.Id)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	js, err := jupyterclient.MakeJupyterSession(ctx, &ci, Logger{})
	if err != nil {
		log.Fatal(err)
	}

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("?> ")
		expr, err := reader.ReadString('\n')
		if err != nil {
			cancel()
			os.Exit(0)
		}
		expr = strings.TrimRight(expr, "\r\n")
		if strings.HasPrefix(expr, "%") || strings.HasPrefix(expr, "!") {
			err = js.Initialize(nil, expr)
			if err != nil {
				fmt.Printf("[ERROR] %s: %s\n", expr, err.Error())
			}
		} else {
			result, err := js.Query(expr)
			if err != nil {
				fmt.Printf("[ERROR] %s: %s\n", expr, err.Error())
			} else {
				fmt.Printf("'%s' => '%+v'\n", expr, result)
			}
		}
	}
}
