export async function getBrowseHiddenIds(ids: number[]): Promise<Set<number>> {
  const hidden = new Set<number>();
  const unique = [...new Set(ids)];
  for (let offset=0;offset<unique.length;offset+=50) {
    const batch = unique.slice(offset,offset+50);
    try {
      const response = await fetch('/api/browse-policy?ids='+batch.join(','),{cache:'no-store'});
      if (!response.ok) throw new Error('Browse classification unavailable');
      const data = await response.json();
      for (const id of data.hidden || []) hidden.add(id);
    } catch {for(const id of batch) hidden.add(id);}
  }
  return hidden;
}
