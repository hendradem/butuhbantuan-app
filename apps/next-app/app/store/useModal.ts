import { create } from "zustand";

type State = {
  isChangeLocationModalOpen: boolean;
};

type Action = {
  updateChangeLocationModal: (
    isChangeLocationModalOpen: State["isChangeLocationModalOpen"]
  ) => void;
};

const useModal = create<State & Action>()((set) => ({
  isChangeLocationModalOpen: false,
  updateChangeLocationModal: (isChangeLocationModalOpen) => {
    set(() => ({ isChangeLocationModalOpen: isChangeLocationModalOpen }));
  },
}));

export default useModal;
