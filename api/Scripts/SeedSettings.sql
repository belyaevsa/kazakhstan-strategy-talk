-- Seed initial settings for security features
-- Run this script after applying migrations to populate default configuration

-- Insert rate limiting settings
INSERT INTO "Settings" ("Key", "Value", "Description", "UpdatedAt") VALUES
('RateLimitRegistrationsPerHour', '3', 'Maximum registrations allowed per IP address per hour', NOW())
ON CONFLICT ("Key") DO UPDATE SET
  "Value" = EXCLUDED."Value",
  "Description" = EXCLUDED."Description",
  "UpdatedAt" = NOW();

INSERT INTO "Settings" ("Key", "Value", "Description", "UpdatedAt") VALUES
('RateLimitRegistrationsPerDay', '10', 'Maximum registrations allowed per IP address per day', NOW())
ON CONFLICT ("Key") DO UPDATE SET
  "Value" = EXCLUDED."Value",
  "Description" = EXCLUDED."Description",
  "UpdatedAt" = NOW();

-- Insert disposable email domains list
INSERT INTO "Settings" ("Key", "Value", "Description", "UpdatedAt") VALUES
('DisposableEmailDomains', 'tempmail.com,10minutemail.com,guerrillamail.com,mailinator.com,throwaway.email,getnada.com,temp-mail.org,maildrop.cc,yopmail.com,trashmail.com,sharklasers.com,grr.la,spam4.me,emailondeck.com,getairmail.com,mintemail.com,dispostable.com,mvrht.com,mytemp.email,mohmal.com', 'Comma-separated list of disposable email domains to block during registration', NOW())
ON CONFLICT ("Key") DO UPDATE SET
  "Value" = EXCLUDED."Value",
  "Description" = EXCLUDED."Description",
  "UpdatedAt" = NOW();

-- Verify settings were inserted
SELECT "Key", "Value", "Description", "UpdatedAt" FROM "Settings" ORDER BY "Key";
