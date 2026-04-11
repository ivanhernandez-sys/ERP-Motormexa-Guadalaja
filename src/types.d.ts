declare module "*.jsx" {
  const component: any;
  export default component;
}

declare module "./contexts/AuthContext" {
  export const AuthProvider: any;
  export const useAuth: any;
}

declare module "./components/Layout" {
  const Layout: any;
  export default Layout;
}

declare module "./pages/*" {
  const Page: any;
  export default Page;
}