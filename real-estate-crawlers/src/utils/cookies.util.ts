import type { Cookie } from "crawlee";

export const parseCookieString = (cookieString: string): Cookie => {
    const cookieArray = cookieString.split(';').map(part => part.trim());
    const [nameValue, ...attributes] = cookieArray;
    const [name, value] = nameValue.split('=');

    const cookie: Cookie = { name, value };

    attributes.forEach(attribute => {
        const [key, val] = attribute.split('=');
        switch (key.toLowerCase()) {
            case 'domain':
                cookie.domain = val;
                break;
            case 'path':
                cookie.path = val;
                break;
            case 'secure':
                cookie.secure = true;
                break;
            case 'httponly':
                cookie.httpOnly = true;
                break;
            case 'samesite':
                cookie.sameSite = val as 'Strict' | 'Lax' | 'None';
                break;
            case 'max-age':
                cookie.expires = Math.floor(Date.now() / 1000) + parseInt(val);
                break;
        }
    });

    return cookie;
}