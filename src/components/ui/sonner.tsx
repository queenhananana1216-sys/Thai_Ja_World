"use client"

import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';
import { cn } from '@/lib/utils';
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

type ToastTone = "success" | "info" | "warning" | "error" | "loading"

function BrandToastIcon({ tone }: { tone: ToastTone }) {
  const ring =
    tone === "success"
      ? "ring-emerald-400/50 bg-emerald-500/18"
      : tone === "info"
        ? "ring-sky-400/50 bg-sky-500/14"
        : tone === "warning"
          ? "ring-amber-400/55 bg-amber-500/14"
          : tone === "error"
            ? "ring-rose-400/50 bg-rose-500/16"
            : "ring-violet-400/45 bg-violet-500/12"

  return (
    <span className={cn("inline-flex shrink-0 rounded-full p-[3px] ring-1", ring)}>
      <TjBrandElephantMark
        size={16}
        animate={tone === "loading" ? "breathe" : "none"}
        className="shrink-0"
      />
    </span>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <BrandToastIcon tone="success" />,
        info: <BrandToastIcon tone="info" />,
        warning: <BrandToastIcon tone="warning" />,
        error: <BrandToastIcon tone="error" />,
        loading: <BrandToastIcon tone="loading" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
