"use client"

import { useCallback, useEffect, useState } from "react"
import { bootstrapCustomer } from "@/lib/client"
import type { Companion } from "@/lib/types"
import TabBar, { type TabKey } from "./TabBar"
import HomeView from "./HomeView"
import CategoryView from "./CategoryView"
import MessagesView from "./MessagesView"
import ProfileView from "./ProfileView"
import CompanionDetail from "./CompanionDetail"
import CheckoutView from "./CheckoutView"
import OrdersView from "./OrdersView"
import OrderDetailView from "./OrderDetailView"
import MessageDetailView from "./MessageDetailView"
import FighterApplyView from "./FighterApplyView"
import CustomerServiceView from "./CustomerServiceView"

export type ViewState =
  | { name: "home" }
  | { name: "category"; serviceTypeId?: string }
  | { name: "messages" }
  | { name: "profile" }
  | { name: "detail"; companionId: string }
  | { name: "checkout"; companionId: string; unitCount: number; price?: number; spec?: string }
  | { name: "orders" }
  | { name: "order"; orderId: string }
  | { name: "message"; messageId: string }
  | { name: "fighter-apply" }
  | { name: "cs" }

export default function UserApp() {
  const [tab, setTab] = useState<TabKey>("home")
  const [view, setView] = useState<ViewState>({ name: "home" })
  const [notice, setNotice] = useState<string | null>(null)
  const [ordersKey, setOrdersKey] = useState(0)

  useEffect(() => {
    bootstrapCustomer().catch(() => undefined)
  }, [])

  // 小程序登录页拿到 openid/手机号后，通过 ?mini_bind=TOKEN 带回网页，这里完成顾客会话绑定
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const token = params.get("mini_bind")
    if (!token) return
    params.delete("mini_bind")
    const next = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, "", next)
    ;(async () => {
      try {
        const result = await fetch("/api/wechat/mini/bind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).then((res) => res.json().catch(() => null))
        if (result && result.phone) notify(`已通过小程序登录，手机号 ${result.phone}`)
        else if (result && result.openid) notify("已通过小程序登录")
      } catch {
        notify("小程序绑定失败，请重新登录")
      }
    })()
  }, [])

  const go = useCallback((v: ViewState) => {
    if (v.name === "home" || v.name === "category" || v.name === "messages" || v.name === "profile") setTab(v.name)
    setView(v)
    if (typeof window !== "undefined") window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const target = sessionStorage.getItem("delta_return_view")
    if (target === "fighter-apply") {
      sessionStorage.removeItem("delta_return_view")
      go({ name: "fighter-apply" })
    }
  }, [go])

  const notify = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2800)
  }, [])

  const refreshOrders = useCallback(() => setOrdersKey((k) => k + 1), [])

  const back = useCallback(() => {
    if (view.name === "detail" || view.name === "checkout") go({ name: tab === "category" ? "category" : "home" })
    else if (view.name === "order") go({ name: "orders" })
    else if (view.name === "message") go({ name: "messages" })
    else if (view.name === "cs") go({ name: "messages" })
    else if (view.name === "orders") go({ name: "profile" })
    else if (view.name === "fighter-apply") go({ name: "profile" })
  }, [go, tab, view.name])

  const showFloatingChat =
    view.name !== "detail" && view.name !== "checkout" && view.name !== "cs" && view.name !== "message"

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      {view.name === "home" && (
        <HomeView
          onOpenCompanion={(id) => go({ name: "detail", companionId: id })}
          onOpenCategory={(serviceTypeId) => go({ name: "category", serviceTypeId })}
        />
      )}
      {view.name === "category" && (
        <CategoryView initialServiceTypeId={view.serviceTypeId} onOpenCompanion={(id) => go({ name: "detail", companionId: id })} />
      )}
      {view.name === "messages" && <MessagesView onOpen={(id) => go({ name: "message", messageId: id })} onOpenChat={() => go({ name: "cs" })} />}
      {view.name === "cs" && <CustomerServiceView onBack={back} />}
      {view.name === "profile" && (
        <ProfileView onOrders={() => go({ name: "orders" })} onFighterApply={() => go({ name: "fighter-apply" })} />
      )}
      {view.name === "detail" && (
        <CompanionDetail
          companionId={view.companionId}
          onBack={back}
          onCheckout={(companion, unitCount, opts) =>
            go({ name: "checkout", companionId: companion.id, unitCount, price: opts.effectivePrice, spec: opts.spec })
          }
        />
      )}
      {view.name === "checkout" && (
        <CheckoutView
          companionId={view.companionId}
          unitCount={view.unitCount}
          price={view.price}
          spec={view.spec}
          onBack={back}
          onSubmitted={(orderId) => {
            notify("下单成功，等待接单")
            refreshOrders()
            go({ name: "order", orderId })
          }}
        />
      )}
      {view.name === "orders" && (
        <OrdersView refreshKey={ordersKey} onOpenOrder={(id) => go({ name: "order", orderId: id })} onNotice={notify} />
      )}
      {view.name === "order" && (
        <OrderDetailView orderId={view.orderId} onBack={back} onCancelled={refreshOrders} onNotice={notify} />
      )}
      {view.name === "message" && <MessageDetailView messageId={view.messageId} onBack={back} />}
      {view.name === "fighter-apply" && <FighterApplyView onBack={back} onNotice={notify} />}

      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-primary/40 bg-surface px-4 py-2 text-sm text-primary shadow-glow">
          {notice}
        </div>
      )}

      {showFloatingChat && (
        <button
          type="button"
          onClick={() => go({ name: "cs" })}
          aria-label="打开智能客服"
          className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full border border-primary/30 bg-primary text-white shadow-glow transition-transform active:scale-95"
          style={{ width: 52, height: 52, bottom: 84 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {view.name !== "detail" && view.name !== "checkout" && view.name !== "cs" && view.name !== "message" && (
        <TabBar
          active={tab}
          onTab={(k) => {
            if (k === "home") go({ name: "home" })
            else if (k === "category") go({ name: "category" })
            else if (k === "messages") go({ name: "messages" })
            else go({ name: "profile" })
          }}
        />
      )}
    </div>
  )
}
