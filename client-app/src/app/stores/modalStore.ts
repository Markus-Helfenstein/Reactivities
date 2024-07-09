import { makeAutoObservable } from "mobx"
import { IResettable } from "./store";

interface Modal {
    open: boolean;
    body: JSX.Element | null;
}

export default class ModalStore implements IResettable {
    modal: Modal = {
        open: false,
        body: null
    }

    constructor() {
        makeAutoObservable(this);
    }

    reset = () => {
        this.closeModal();
    };

    openModal = (content: JSX.Element) => {
        this.modal.open = true;
        this.modal.body = content;
    }

    closeModal = () => {
        this.modal.open = false;
        this.modal.body = null;
    }
}