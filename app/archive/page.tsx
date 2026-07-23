import { getArchivedPremixes } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function ArchivePage() {
  const archived = await getArchivedPremixes()

  return (
    <>
      <h1>Recipe Archive</h1>
      <p>Previous premix recipes that have been retired.</p>
      {archived.length === 0 ? (
        <p>Nothing archived yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Premix</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {archived.map((a) => (
              <tr key={`${a.premix_id}-${a.archived_at}`}>
                <td>{a.name}</td>
                <td>{new Date(a.archived_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
