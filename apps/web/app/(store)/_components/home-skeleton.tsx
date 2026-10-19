/** Hero-shaped placeholder while the home content streams in (no CLS). */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" className="site-container pt-[9vw] pb-16 md:pt-[6vw]">
      <div className="skeleton mx-auto aspect-[4/5] w-full max-w-md" />
      <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}
