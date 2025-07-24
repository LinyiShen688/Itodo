import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      // 添加登录成功标记到重定向URL
      const redirectUrl = new URL(next, origin);
      redirectUrl.searchParams.set('login', 'success');
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(redirectUrl.toString());
      } else if (forwardedHost) {
        redirectUrl.host = forwardedHost;
        redirectUrl.protocol = 'https:';
        return NextResponse.redirect(redirectUrl.toString());
      } else {
        return NextResponse.redirect(redirectUrl.toString());
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}