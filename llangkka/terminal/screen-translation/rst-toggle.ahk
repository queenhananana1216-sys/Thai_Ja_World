#Requires AutoHotkey v1.1
; llangkka: RSTGameTranslation 오버레이/번역 토글 단축키
; F7 = Alt+F (Overlay on/off)
; F8 = Alt+G (Start/Stop translation)

#NoEnv
SendMode Input
SetTitleMatchMode 2

#If WinActive("ahk_exe rst.exe")
F7::
  Send, !f
return

F8::
  Send, !g
return
#If

