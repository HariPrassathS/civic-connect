-- Add fcm_token to profiles for push notifications
ALTER TABLE profiles ADD COLUMN fcm_token text;
