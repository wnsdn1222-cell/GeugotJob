-- The private table is reachable only through owner-checked RPCs.
create policy "no client personal location access"
on private.personal_location_preferences
for all to authenticated
using (false) with check (false);
