package plugin

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnectionStrategy(t *testing.T) {
	_, err := makeConnectionStrategy(&InstanceSettings{ConnectionType:"AUTO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"INFO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"CORNDOG"})
	assert.NotNil(t, err)
}

