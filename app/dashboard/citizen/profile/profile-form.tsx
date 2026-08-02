"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  Camera,
  Building2,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dynamic from "next/dynamic";

// Lazy load the map component (Leaflet requires window)
const ProfileMap = dynamic(() => import("./profile-map"), { ssr: false });

interface ProfileFormProps {
  profile: any;
  userEmail: string;
  userAvatar: string;
}

export function ProfileForm({ profile, userEmail, userAvatar }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [district, setDistrict] = useState(profile?.district || "");
  const [area, setArea] = useState(profile?.area || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "Tamil Nadu");
  const [pincode, setPincode] = useState(profile?.pincode || "");
  const [lat, setLat] = useState<number | null>(profile?.lat || null);
  const [lng, setLng] = useState<number | null>(profile?.lng || null);
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatar_url || userAvatar || ""
  );

  const email = profile?.email || userEmail;

  // Handle map click → reverse geocode
  const handleMapClick = useCallback(async (latitude: number, longitude: number) => {
    setLat(latitude);
    setLng(longitude);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { "User-Agent": "CivicConnect/1.0" } }
      );
      const data = await res.json();
      const addr = data.address || {};

      setAddress(data.display_name || "");
      setDistrict(addr.county || addr.state_district || addr.district || "");
      setArea(addr.suburb || addr.neighbourhood || addr.village || addr.town || "");
      setCity(addr.city || addr.town || addr.village || "");
      setState(addr.state || "Tamil Nadu");
      setPincode(addr.postcode || "");
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  }, []);

  // Detect current location
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleMapClick(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setError("Could not detect your location. Please allow location access.");
      }
    );
  }, [handleMapClick]);

  // Save profile
  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          address,
          district,
          area,
          city,
          state,
          pincode,
          lat,
          lng,
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        return;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Profile Header Card ────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700" />
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-full border-4 border-background bg-muted overflow-hidden shadow-xl">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500">
                    <User className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 text-white shadow-lg cursor-pointer">
                <Camera className="h-3.5 w-3.5" />
              </div>
            </div>
            {/* Name & Email */}
            <div className="text-center sm:text-left sm:pb-1">
              <h2 className="text-lg font-bold">{fullName || "Citizen"}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
              <span className="mt-1 inline-block rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 capitalize">
                {profile?.role || "citizen"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Alerts ─────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Profile saved successfully!
        </div>
      )}

      {/* ── Personal Details Card ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-blue-400" />
            Personal Details
          </CardTitle>
          <CardDescription>Your basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="h-10 pl-9 opacity-60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Location Card with Map ─────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-cyan-400" />
                Location & Address
              </CardTitle>
              <CardDescription>
                Click on the map or use auto-detect to set your location
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectLocation}
              className="gap-1.5"
            >
              <Map className="h-3.5 w-3.5" />
              Auto Detect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Map */}
          <div className="h-[300px] rounded-xl overflow-hidden border border-border/50">
            <ProfileMap
              lat={lat}
              lng={lng}
              onMapClick={handleMapClick}
            />
          </div>

          {/* Address Fields */}
          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Auto-filled from map or type manually"
              className="h-10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="district">
                <Building2 className="mr-1 inline h-3.5 w-3.5" />
                District
              </Label>
              <Input
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Madurai"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area / Suburb</Label>
              <Input
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Anna Nagar"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City / Town</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Madurai"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Tamil Nadu"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="625001"
                className="h-10"
              />
            </div>
            {lat && lng && (
              <div className="space-y-2">
                <Label>Coordinates</Label>
                <Input
                  value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                  disabled
                  className="h-10 font-mono text-xs opacity-60"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Save Button ────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
