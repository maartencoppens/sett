const base = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export function feedUrls(token: string) {
    const https = `${base}/functions/v1/ics-feed/${token}.ics`;
    const webcal = https.replace(/^https:\/\//, "webcal://");
    return {
        https, // for copying into Outlook or other apps
        webcal, // opens Apple Calendar's "Subscribe" prompt
        google: `https://calendar.google.com/calendar/r?cid=${
            encodeURIComponent(webcal)
        }`,
    };
}
