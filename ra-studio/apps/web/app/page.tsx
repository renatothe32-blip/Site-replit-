"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    // try fetching projects (requires auth)
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/projects`).then((r) => setProjects(r.data)).catch(() => {});
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Seus projetos</p>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
