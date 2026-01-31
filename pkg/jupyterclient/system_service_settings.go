package jupyterclient

import (
	"os"
)

type SystemServiceSettings struct {
	Host string
	Port string
}

func DefaultSystemServiceSettings() *SystemServiceSettings {
	return &SystemServiceSettings{
		Host: os.Getenv("SYSTEM_SERVICE_HOST"),
		Port: os.Getenv("SYSTEM_SERVICE_PORT"),
	}
}

