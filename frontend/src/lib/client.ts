// Placeholder Encore client - replace with your generated client
export type BaseURL = string;

type RequestOptions = {
  auth?: { authorization: string };
};

export default class Client {
  constructor(
    private baseURL: string,
    private options: RequestOptions = {}
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    
    if (this.options.auth?.authorization) {
      headers.set('Authorization', this.options.auth.authorization);
    }

    const res = await fetch(new URL(path, this.baseURL).toString(), {
      ...init,
      headers,
    });

    if (res.status === 401) {
      window.location.href = '/signin';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // Example typed endpoints - replace with your actual Encore generated client
  me = {
    get: () => this.request<{ id: string; email: string; displayName?: string }>('/me'),
    getOnboarding: () => this.request<{ completed: boolean }>('/me/onboarding'),
    updateProfile: (body: any) => this.request('/me/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  };

  billing = {
    getSubscription: () => this.request<{ status: 'active' | 'past_due' | 'none'; planId?: string }>('/billing/subscription'),
    createCheckoutSession: (body: { planId: string; returnUrl: string }) =>
      this.request<{ checkoutUrl: string }>('/billing/checkout', { method: 'POST', body: JSON.stringify(body) }),
    inspectCheckoutSession: (params: { sessionId: string }) =>
      this.request<{ status: 'active' | 'incomplete' | 'failed' }>(`/billing/checkout/session?session_id=${params.sessionId}`),
    getPortalUrl: () => this.request<{ url: string }>('/billing/portal'),
  };

  orgs = {
    list: () => this.request<Array<{ id: string; name: string; slug: string; role: 'admin' | 'editor' | 'member' }>>('/orgs'),
    create: (body: { name: string; slug: string }) => this.request<{ id: string }>('/orgs', { method: 'POST', body: JSON.stringify(body) }),
    getSummary: (params: { orgId: string }) => this.request<{ workspaces: number; members: number; files: number }>(`/orgs/${params.orgId}/summary`),
  };

  members = {
    list: (params: { orgId: string }) => this.request<Array<{ id: string; email: string; role: 'admin' | 'editor' | 'member' }>>(`/orgs/${params.orgId}/members`),
    createInvite: (params: { orgId: string; email: string; role: 'admin' | 'editor' | 'member' }) =>
      this.request<{ inviteLink: string }>(`/orgs/${params.orgId}/invites`, { method: 'POST', body: JSON.stringify({ email: params.email, role: params.role }) }),
    update: (params: { orgId: string; userId: string; role: 'admin' | 'editor' | 'member' }) =>
      this.request(`/orgs/${params.orgId}/members/${params.userId}`, { method: 'PATCH', body: JSON.stringify({ role: params.role }) }),
  };

  files = {
    list: (params: { orgId: string; workspaceId: string }) =>
      this.request<Array<{ id: string; name: string; size: number; createdAt: string }>>(`/orgs/${params.orgId}/workspaces/${params.workspaceId}/files`),
    getUploadUrl: (params: { orgId: string; workspaceId: string; filename: string; size: number; type: string }) =>
      this.request<{ url: string; fields: Record<string, string> }>(`/orgs/${params.orgId}/workspaces/${params.workspaceId}/files/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ filename: params.filename, size: params.size, type: params.type }),
      }),
    confirm: (params: { orgId: string; workspaceId: string; filename: string }) =>
      this.request(`/orgs/${params.orgId}/workspaces/${params.workspaceId}/files/confirm`, {
        method: 'POST',
        body: JSON.stringify({ filename: params.filename }),
      }),
  };

  workspaces = {
    list: (params: { orgId: string }) => this.request<Array<{ id: string; name: string; slug: string }>>(`/orgs/${params.orgId}/workspaces`),
    create: (params: { orgId: string; name: string; slug: string }) =>
      this.request<{ id: string }>(`/orgs/${params.orgId}/workspaces`, { method: 'POST', body: JSON.stringify({ name: params.name, slug: params.slug }) }),
    get: (params: { orgId: string; workspaceId: string }) =>
      this.request<{ id: string; name: string; slug: string }>(`/orgs/${params.orgId}/workspaces/${params.workspaceId}`),
  };
}
