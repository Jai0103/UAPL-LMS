export function getGoogleDriveFileId(url) {
    if (!url) return "";

    const value = String(url).trim();

    const fileMatch = value.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    const idMatch = value.match(/[?&]id=([^&]+)/);
    if (idMatch?.[1]) return idMatch[1];

    return "";
}

export function getVideoEmbedUrl(url) {
    if (!url) return "";

    const value = String(url).trim();
    const driveId = getGoogleDriveFileId(value);

    if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/preview`;
    }

    return value;
}

export function getVideoOpenUrl(url) {
    if (!url) return "";

    const value = String(url).trim();
    const driveId = getGoogleDriveFileId(value);

    if (driveId) {
        return `https://drive.google.com/file/d/${driveId}/view`;
    }

    return value;
}
