export const dynamicParams = false;

export async function generateStaticParams() {
  function formatYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  const today = new Date();
  const totalDays = 241; // 과거 120 + 오늘 + 미래 120
  const start = new Date(today.getTime());
  start.setDate(today.getDate() - 120);

  const params = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    params.push({ date: formatYYYYMMDD(d) });
  }
  return params;
}

export default function Layout(props: { children: React.ReactNode }) {
  return props.children as any;
}


