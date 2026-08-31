package domain

import (
	"errors"
	"strings"
)

var ErrJenisPelayananRequired = errors.New("jenis_pelayanan is required")

// ResolveJenisPelayanan validates the citizen's choice against unit modes.
// Auto-picks when the unit offers exactly one mode and none was sent.
func ResolveJenisPelayanan(chosen string, unit Emergency) (string, error) {
	code := strings.ToLower(strings.TrimSpace(chosen))
	modes := normalizeJenisModes(unit.TipeEmergency)
	if code == "" {
		if len(modes) == 1 {
			return modes[0], nil
		}
		if len(modes) > 1 {
			return "", ErrJenisPelayananRequired
		}
		return "", nil
	}
	if len(modes) == 0 {
		return code, nil
	}
	for _, m := range modes {
		if m == code {
			return code, nil
		}
	}
	return "", errors.New("jenis pelayanan not offered by this unit")
}

func normalizeJenisModes(modes []string) []string {
	out := make([]string, 0, len(modes))
	seen := make(map[string]struct{}, len(modes))
	for _, raw := range modes {
		m := strings.ToLower(strings.TrimSpace(raw))
		if m == "" {
			continue
		}
		if _, ok := seen[m]; ok {
			continue
		}
		seen[m] = struct{}{}
		out = append(out, m)
	}
	return out
}
