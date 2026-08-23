package sar

import (
	"encoding/json"
	"log"
)

const defaultPersistPath = "./data/sar_store.json"

// storeSnapshot is the durable shape for MemoryStore (JSON file or MySQL).
type storeSnapshot struct {
	Config         AppConfig                   `json:"config"`
	Missions       map[string]Mission          `json:"missions"`
	Shifts         map[string][]Shift          `json:"shifts"`
	Teams          map[string][]ShiftTeam      `json:"teams"`
	Sectors        map[string][]Sector         `json:"sectors"`
	Members        map[string][]Member         `json:"members"`
	Positions      map[string][]PositionReport `json:"positions"`
	Markers        map[string][]MapMarker      `json:"markers"`
	ShareIndex     map[string]string           `json:"share_index"`
	LiveTracks     map[string]LiveTrack        `json:"live_tracks"`
}

func (s *MemoryStore) loadLocked() {
	if s.persister != nil {
		snap, ok, err := s.persister.Load()
		if err != nil {
			log.Printf("sar: load failed: %v", err)
			return
		}
		if ok {
			applySnapshotLocked(s, snap)
		}
		return
	}
	if s.persistPath == "" {
		return
	}
	snap, ok, err := (filePersister{path: s.persistPath}).Load()
	if err != nil || !ok {
		return
	}
	applySnapshotLocked(s, snap)
}

func cloneSnapshot(snap storeSnapshot) storeSnapshot {
	raw, err := json.Marshal(snap)
	if err != nil {
		return storeSnapshot{}
	}
	var out storeSnapshot
	if err := json.Unmarshal(raw, &out); err != nil {
		return storeSnapshot{}
	}
	normalizeSnapshot(&out)
	return out
}

func (s *MemoryStore) ensurePersistWorker() {
	s.persistOnce.Do(func() {
		s.persistSignal = make(chan struct{}, 1)
		go s.persistWorker()
	})
}

func (s *MemoryStore) persistWorker() {
	for range s.persistSignal {
		for {
			s.persistMu.Lock()
			snap := s.pendingSnap
			s.pendingSnap = nil
			s.persistMu.Unlock()
			if snap == nil {
				break
			}
			if s.persister != nil {
				if err := s.persister.Save(*snap); err != nil {
					log.Printf("sar: persist failed: %v", err)
				}
				continue
			}
			if s.persistPath != "" {
				if err := (filePersister{path: s.persistPath}).Save(*snap); err != nil {
					log.Printf("sar: file persist failed: %v", err)
				}
			}
		}
	}
}

// persistLocked queues a durable write without blocking the request path.
// Caller must hold at least RLock (or Lock). Latest snapshot wins if busy.
func (s *MemoryStore) persistLocked() {
	s.ensurePersistWorker()
	snap := cloneSnapshot(currentSnapshotLocked(s))
	s.persistMu.Lock()
	s.pendingSnap = &snap
	s.persistMu.Unlock()
	select {
	case s.persistSignal <- struct{}{}:
	default:
	}
}

// FlushPersist blocks until the pending snapshot (if any) is written.
func (s *MemoryStore) FlushPersist() {
	s.ensurePersistWorker()
	s.persistMu.Lock()
	snap := s.pendingSnap
	s.pendingSnap = nil
	s.persistMu.Unlock()
	if snap == nil {
		return
	}
	if s.persister != nil {
		if err := s.persister.Save(*snap); err != nil {
			log.Printf("sar: flush persist failed: %v", err)
		}
		return
	}
	if s.persistPath != "" {
		_ = (filePersister{path: s.persistPath}).Save(*snap)
	}
}
