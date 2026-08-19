import 'next-auth';
import 'next-auth/jwt';

type AdminRole = 'OWNER' | 'ADMIN' | 'EDITOR';

declare module 'next-auth' {
    interface User {
        role: AdminRole;
    }

    interface Session {
        user: {
            id: string;
            role: AdminRole;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        role?: AdminRole;
    }
}
