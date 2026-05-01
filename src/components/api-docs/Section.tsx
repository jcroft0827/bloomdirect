// /components/api-docs/Section.tsx

type Props = {
  title: string;
  children: React.ReactNode;
};

export default function Section({ title, children }: Props) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}