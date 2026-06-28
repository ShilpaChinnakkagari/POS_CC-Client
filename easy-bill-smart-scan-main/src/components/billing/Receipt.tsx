import { CartLine, SaleType, ShopInfo, formatMoney } from "@/lib/store";

interface Props {
  shop: ShopInfo;
  cart: CartLine[];
  invoiceNo: string;
  date: Date;
  customer?: string;
  cashier?: string;
  saleType?: SaleType;
  discount?: number;
}

export function Receipt({ shop, cart, invoiceNo, date, customer, cashier, saleType, discount = 0 }: Props) {
  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * shop.taxPercent) / 100;
  const total = taxable + tax;

  return (
    <div id="receipt-print" className="mx-auto w-[300px] bg-white p-4 font-mono text-xs text-black">
      <div className="text-center">
        <div className="text-base font-bold tracking-wider">{shop.name}</div>
        <div>{shop.address}</div>
        <div>Tel: {shop.phone}</div>
      </div>
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Inv: {invoiceNo}</span>
        <span>{date.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Customer: {customer || "Customer"}</span>
        <span>{saleType || "Cash"}</span>
      </div>
      <div>Cashier: {cashier || "Admin"}</div>
      <div className="my-2 border-t border-dashed border-black" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="py-1 text-left">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">MRP</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((l) => (
            <tr key={l.code} className="align-top">
              <td className="py-1">
                <div>{l.name}</div>
                <div className="text-[10px] opacity-70">#{l.code}</div>
              </td>
              <td className="py-1 text-right">
                {l.qty}
                {l.unit}
              </td>
              <td className="py-1 text-right">{(l.mrp ?? l.price).toFixed(2)}</td>
              <td className="py-1 text-right">{l.price.toFixed(2)}</td>
              <td className="py-1 text-right">{(l.qty * l.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-2 border-t border-dashed border-black" />
      <div className="space-y-1">
        <Row label="Subtotal" value={formatMoney(subtotal)} />
        {discount > 0 && <Row label="Discount" value={`- ${formatMoney(discount)}`} />}
        <Row label={`GST (${shop.taxPercent}%)`} value={formatMoney(tax)} />
        <div className="my-1 border-t border-dashed border-black" />
        <Row label="TOTAL" value={formatMoney(total)} bold />
      </div>
      <div className="my-3 border-t border-dashed border-black" />
      <div className="text-center">
        <div>Thank you for shopping!</div>
        <div className="opacity-70">Visit again</div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-sm font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
