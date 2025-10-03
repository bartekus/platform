import { Button } from "./ui/button";
import { Check } from "lucide-react";

export default function PlanCard({
  name,
  description,
  price,
  billingInterval,
  features,
  onSelect,
}: {
  name: string;
  description: string | null;
  price:
    | {
        unitAmount: number;
      }
    | any;
  billingInterval: string;
  features: string[];
  onSelect: () => any;
}) {
  return (
    <div className="border rounded-xl p-6 gradient-card shadow-md hover:shadow-lg transition-smooth">
      <h3 className="text-2xl font-semibold mb-2">{name}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
      {price && (
        <div className="text-4xl font-bold mb-4 mt-4">
          <p className="text-2xl font-bold">
            ${price.unitAmount ? price.unitAmount / 100 : 0}
            <span className="text-base font-normal text-gray-600">/{billingInterval}</span>
          </p>
        </div>
      )}
      <ul className="space-y-3 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-accent flex-shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button variant="accent" className="w-full" onClick={onSelect}>
        Choose {name}
      </Button>
    </div>
  );
}
