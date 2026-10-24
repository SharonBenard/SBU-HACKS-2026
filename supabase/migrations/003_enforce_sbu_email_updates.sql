drop trigger if exists sbu_email_check on auth.users;

create trigger sbu_email_check before insert on auth.users
for each row execute function public.enforce_sbu_email();

create trigger sbu_email_update_check before update of email on auth.users
for each row execute function public.enforce_sbu_email();
