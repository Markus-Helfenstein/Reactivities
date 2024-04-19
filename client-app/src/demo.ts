export interface IDuck {
    name: string;
    numLegs: number;
    makeSound: (sound: string) => void;
}

class Duck implements IDuck {
    name: string;
    numLegs: number;
    
    constructor(name: string, numLegs: number) {
        this.name = name;
        this.numLegs = numLegs;
    }

    makeSound(sound: string) {
        console.log(sound)
    }
}

const duck1: IDuck = new Duck('huey', 2);

const duck2: IDuck = {
    name: 'duey',
    numLegs: 2,
    makeSound: (sound: string) => console.log(sound)
}

duck1.makeSound('quack');
duck2.makeSound('sound');

export const ducks: IDuck[] = [duck1, duck2]