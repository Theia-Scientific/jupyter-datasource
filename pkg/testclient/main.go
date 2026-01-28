package main

import (
	"bufio"
	"fmt"
	"github.com/Theia-Scientific/theiascientific-jupyter-datasource/pkg/jupyterclient"
	"log"
	"os"
	"strings"
)

func main() {
	sys := jupyterclient.DefaultSystemServiceSettings()
	jup := jupyterclient.DefaultJupyterServiceSettings(&sys)
  jc := jupyterclient.MakeJupyterHttpClient(&jup)

  kernel, err := jc.SelectKernel()
  if err != nil {
    log.Fatal(err)
  }

  ci, err := jc.GetConnectionInfo(&kernel)
  if err != nil {
    log.Fatal(err)
  }

  fmt.Printf("ci: %s\n", ci)

	js := jupyterclient.MakeJupyterSession(&ci)
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("?> ")
		expr, err := reader.ReadString('\n')
		if err != nil {
			os.Exit(0)
		}
		expr = strings.TrimRight(expr, "\r\n")
		js.Query(expr, func(result string) {
			fmt.Printf("'%s' => '%s'\n", expr, result)
		})
	}
}
