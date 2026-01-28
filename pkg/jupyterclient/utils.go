package jupyterclient

import (
	"encoding/hex"
	"fmt"
	"math/rand"
)

func NewId() string {
  part1 := make([]byte, 4)
  rand.Read(part1)
  part2 := make([]byte, 12)
  rand.Read(part2)
  return fmt.Sprintf("%s-%s", hex.EncodeToString(part1), hex.EncodeToString(part2))
}

