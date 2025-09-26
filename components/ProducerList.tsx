// components/ProducerList.tsx
import Link from "next/link";

type Producer = {
    producerId: string;
    name: string;
};

type Props = {
    producers: Producer[];
};

export default function ProducerList({ producers }: Props) {
    return (
        <div>
            <h2>Producenci</h2>
            <ul>
                {producers.map((p) => (
                    <li key={p.producerId}>
                        <Link href={`/producer/${p.producerId}`}>{p.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
