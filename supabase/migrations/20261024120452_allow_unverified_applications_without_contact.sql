-- A public application can contain an unverified email or identity number.
-- Do not require it to point at an existing contact: the legacy AFTER INSERT
-- trigger updates the linked contact's applicant state. Staff may link the
-- application after ownership is verified in a separate workflow.
begin;

alter table public.applications
  alter column contact_id drop not null;

commit;
