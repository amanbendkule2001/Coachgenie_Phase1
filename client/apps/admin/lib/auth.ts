export function authHeaders() {

    const token =
        localStorage.getItem("cg_access_token");

    const tenant =
        localStorage.getItem("tenant_id");

    return {

        Authorization: `Bearer ${token}`,

        "X-Tenant-ID": tenant ?? "",

    };

}