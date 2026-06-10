import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <h1>Not Found</h1>
      <p className="sub" style={{ margin: "0 auto 18px" }}>That sweepstake doesn&apos;t exist (or was deleted).</p>
      <Link className="btn" href="/new">Create one →</Link>
    </div>
  );
}
