// components/ProductDetail.tsx
type Props = {
    name: string;
    margin: number;
    prices: Record<string, Record<string, number>>;
};

export default function ProductDetail({ name, margin, prices }: Props) {
    return (
        <div>
            <h3>{name}</h3>
            {Object.entries(prices).map(([fabric, configs]) => (
                <div key={fabric}>
                    <h4>{fabric}</h4>
                    <ul>
                        {Object.entries(configs).map(([config, price]) => (
                            <li key={config}>
                                {config}: {(price * margin).toFixed(2)} zł
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
