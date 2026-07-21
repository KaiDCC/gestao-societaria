import { StrictMode } from 'react'
import { Toaster } from 'sonner'
import ReactDOM from 'react-dom/client'
import { 
  Outlet, 
  RouterProvider, 
  createRouter, 
  createRoute, 
  createRootRoute,
  redirect
} from '@tanstack/react-router'


import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './features/apps/dashboard'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { ContratosPage } from './features/apps/contratos'
import { EmpresasPage } from './features/apps/empresas'
import { AlvarasPage } from './features/apps/alvaras'
import { CertificadosPage } from './features/apps/certificados'
import { EcpfsPage } from './features/apps/ecpf'
import { UsuariosPage } from './features/apps/usuarios'

import './index.css'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  path: '/login',
  getParentRoute: () => rootRoute,
  component: LoginPage,
})

const resetPasswordRoute = createRoute({
  path: '/reset-password',
  getParentRoute: () => rootRoute,
  component: ResetPasswordPage,
})

const appLayoutRoute = createRoute({
  id: 'app-layout',
  getParentRoute: () => rootRoute,
  beforeLoad: () => {
    const userStr = localStorage.getItem('user')
    
    if (!userStr || userStr === '{}') {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

const indexRoute = createRoute({
  path: '/',
  getParentRoute: () => appLayoutRoute,
  component: Dashboard,
})

const contratosRoute = createRoute({
  path: '/contratos',
  getParentRoute: () => appLayoutRoute,
  component: ContratosPage,
})

const empresasRoute = createRoute({
  path: '/empresas',
  getParentRoute: () => appLayoutRoute,
  component: EmpresasPage,
})

const alvarasRoute = createRoute({
  path: '/alvaras',
  getParentRoute: () => appLayoutRoute,
  component: AlvarasPage,
})

const usuariosRoute = createRoute({
  path: '/usuarios',
  getParentRoute: () => appLayoutRoute,
  component: UsuariosPage,
})

const certificadosCnpjRoute = createRoute({
  path: '/certificados/e-cnpj',
  getParentRoute: () => appLayoutRoute,
  component: CertificadosPage,
})

const certificadosCpfRoute = createRoute({
  path: '/certificados/e-cpf',
  getParentRoute: () => appLayoutRoute,
  component: EcpfsPage,
})


const routeConfig = rootRoute.addChildren([
  loginRoute,
  resetPasswordRoute,
  appLayoutRoute.addChildren([
    indexRoute,
    contratosRoute,
    empresasRoute,
    alvarasRoute,
    usuariosRoute,
    certificadosCnpjRoute,
    certificadosCpfRoute,
  ]),
])

const router = createRouter({ routeTree: routeConfig })

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </StrictMode>,
  )
}
