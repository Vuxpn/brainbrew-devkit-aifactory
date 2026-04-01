Add-Type -AssemblyName System.Windows.Forms
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipTitle = "Claude Code"
$notify.BalloonTipText = "Task completed"
$notify.Visible = $true
$notify.ShowBalloonTip(3000)
