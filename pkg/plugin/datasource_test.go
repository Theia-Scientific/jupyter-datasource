package plugin

import (
	// "context"
	"testing"

	// "github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestConnectionStrategy(t *testing.T) {
	_, err := makeConnectionStrategy(&InstanceSettings{ConnectionType:"AUTO"})
	if err != nil {
		t.Error(err)
	}

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"INFO"})
	if err != nil {
		t.Error(err)
	}

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"CORNDOG"})
	if err == nil {
		t.Error("makeConnectionStrategy isn't erroring on a weird ConnectionType")
	}
}

func TestQueryData(t *testing.T) {
	// @TODO: figure out how to mock jupyter 
	// ds := Datasource{}

	// resp, err := ds.QueryData(
	// 	context.Background(),
	// 	&backend.QueryDataRequest{
	// 		Queries: []backend.DataQuery{
	// 			{RefID: "A"},
	// 		},
	// 	},
	// )
	// if err != nil {
	// 	t.Error(err)
	// }

	// if len(resp.Responses) != 1 {
	// 	t.Fatal("QueryData must return a response")
	// }
}
