drop policy "auth only" on public.accounts;
create policy "allow anon access" on public.accounts for all using (true) with check (true);

drop policy "auth only" on public.categories;
create policy "allow anon access" on public.categories for all using (true) with check (true);

drop policy "auth only" on public.goals;
create policy "allow anon access" on public.goals for all using (true) with check (true);

drop policy "auth only" on public.recurrence_groups;
create policy "allow anon access" on public.recurrence_groups for all using (true) with check (true);

drop policy "Authenticated users can manage tags" on public.tags;
create policy "allow anon access" on public.tags for all using (true) with check (true);

drop policy "auth only" on public.transaction_payments;
create policy "allow anon access" on public.transaction_payments for all using (true) with check (true);

drop policy "auth only" on public.transaction_tags;
create policy "allow anon access" on public.transaction_tags for all using (true) with check (true);

drop policy "auth only" on public.transaction_types;
create policy "allow anon access" on public.transaction_types for all using (true) with check (true);

drop policy "auth only" on public.transactions;
create policy "allow anon access" on public.transactions for all using (true) with check (true);
