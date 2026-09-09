package hub

import (
	"testing"
	"time"
)

func TestPublishScoped_wilayahChannels(t *testing.T) {
	h := New()

	regCh, unsubR := h.Subscribe(RegencyChannel("3404"))
	defer unsubR()
	provCh, unsubP := h.Subscribe(ProvinceChannel("34"))
	defer unsubP()
	unitCh, unsubU := h.Subscribe("unit-a")
	defer unsubU()
	adminCh, unsubA := h.Subscribe(AdminChannel)
	defer unsubA()

	h.PublishScoped("unit-a", "3404", "34", Event{Type: "new_order", Payload: map[string]string{"id": "1"}})

	expect := func(name string, ch <-chan Event) {
		t.Helper()
		select {
		case ev := <-ch:
			if ev.Type != "new_order" {
				t.Fatalf("%s: got type %s", name, ev.Type)
			}
		case <-time.After(500 * time.Millisecond):
			t.Fatalf("%s: timeout waiting for event", name)
		}
	}
	expect("unit", unitCh)
	expect("regency", regCh)
	expect("province", provCh)
	expect("admin", adminCh)
}

func TestSubscribeMany(t *testing.T) {
	h := New()
	out, unsub := h.SubscribeMany([]string{"u1", RegencyChannel("3404")})
	defer unsub()

	h.Publish("u1", Event{Type: "order_reassigned", Payload: nil})
	select {
	case ev := <-out:
		if ev.Type != "order_reassigned" {
			t.Fatalf("got %s", ev.Type)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timeout")
	}

	h.PublishScoped("", "3404", "", Event{Type: "new_order", Payload: "x"})
	select {
	case ev := <-out:
		if ev.Type != "new_order" {
			t.Fatalf("got %s", ev.Type)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timeout wilayah")
	}
}
