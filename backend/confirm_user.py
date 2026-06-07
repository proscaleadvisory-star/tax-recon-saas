from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:TaxReconSecret123!@db.dbcvppoqjfydzmaasmyq.supabase.co:5432/postgres')
with engine.connect() as conn:
    conn.execute(text("UPDATE auth.users SET email_confirmed_at = NOW(), confirmed_at = NOW() WHERE email = 'proscaleadvisory@gmail.com'"))
    conn.commit()
print("User confirmed in database successfully!")
