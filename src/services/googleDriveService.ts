/**
 * Google Drive Service for uploading settlement proofs
 */

const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export class GoogleDriveService {
  private static accessToken: string | null = null;

  /**
   * Check if Google Drive is configured with a Client ID
   */
  static isConfigured(): boolean {
    return !!CLIENT_ID;
  }

  /**
   * Check if we already have an access token
   */
  static isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Pre-load the Google Identity Services script
   */
  static init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Identity Services and get an access token
   * IMPORTANT: This must be called from a direct user gesture (like a button click) for Safari compatibility.
   */
  static async authenticate(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    await this.init();

    return new Promise((resolve, reject) => {
      if (!CLIENT_ID) {
        reject(new Error('VITE_GOOGLE_CLIENT_ID is not defined.'));
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          console.log('Google Auth Response:', response);
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          this.accessToken = response.access_token;
          resolve(response.access_token);
        },
        error_callback: (err: any) => {
          console.error('Google Auth Error Callback:', err);
          reject(new Error('Google Authentication failed to initialize'));
        }
      });
      
      try {
        // This call triggers the popup and MUST be within a user gesture handler
        client.requestAccessToken();
      } catch (err) {
        console.error('Request Access Token Error:', err);
        reject(new Error('Failed to open Google login popup. Please check if popups are blocked.'));
      }
    });
  }

  /**
   * Upload a file to Google Drive
   */
  static async uploadFile(file: File): Promise<string> {
    // If not authenticated, this will try to authenticate. 
    // Best practice is to call authenticate() separately from a button first.
    const token = await this.authenticate();

    const metadata = {
      name: `settlement_proof_${Date.now()}_${file.name}`,
      mimeType: file.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload to Google Drive');
    }

    const data = await response.json();
    const fileId = data.id;
    
    // Make the file readable by anyone with the link (optional but helpful for the partner)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (err) {
      console.warn('Failed to set file permissions, partner might not be able to view it:', err);
    }

    // Return a direct link that can be used in <img> tags
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
}
