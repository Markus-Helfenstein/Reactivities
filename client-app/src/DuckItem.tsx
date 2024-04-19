import { IDuck } from './demo';

interface Props {
    duck: IDuck;
}

function DuckItem(props: Props) {
    const {duck} = props

    return (
        <div>
          <span>{duck.name}</span>
          <button onClick={() => duck.makeSound(duck.name + ' quack')}>Make sound</button>
        </div>
    )
}

export default DuckItem
