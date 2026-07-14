/** Dataset Scene Shell · Protocol v1 */
(function () {
  'use strict';

  var hub = window.__GD_DATASET_SCENE_HUB__;
  if (!hub || hub.protocolVersion !== 1) {
    console.error('[dataset-shell] Registry 不存在或协议版本不兼容');
    return;
  }
  if (hub._shellReady) return;
  hub._shellReady = true;

  // 内嵌设计资源，保证平台以单文件脚本注入时无需额外静态资源服务。
  var BRAND_ICON = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+aWNvbkAyeDwvdGl0bGU+CiAgICA8ZGVmcz4KICAgICAgICA8bGluZWFyR3JhZGllbnQgeDE9Ijg1Ljk2OTMxMDQlIiB5MT0iMTMuOTEyMTE1NiUiIHgyPSIwJSIgeTI9IjUwJSIgaWQ9ImxpbmVhckdyYWRpZW50LTEiPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjNEVFQzk3IiBvZmZzZXQ9IjAlIj48L3N0b3A+CiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiM0MEMyRTMiIG9mZnNldD0iNDkuNzUzMjk4NSUiPjwvc3RvcD4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzM0NzdGRiIgb2Zmc2V0PSIxMDAlIj48L3N0b3A+CiAgICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICAgIDxnIGlkPSLlnIbmlrnmj5Lku7Yt5pWw5o2u6ZuG5pm66IO95Yqp5omLIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iaWNvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwgMCkiIGZpbGw9InVybCgjbGluZWFyR3JhZGllbnQtMSkiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTUuNjU2OTIwNSwyLjI3OTY1NjY2IEMxNS43ODYwOTkyLDIuMjc5NjU2NjYgMTUuODI2MTEwNCwyLjUwMTQzMDE3IDE1LjcxNjM2NTYsMi41Njg4NzY3OCBDMTUuMjE3OTQxNCwyLjg3NDEwMTE2IDE0Ljg2Njk4NjgsMy4zMjkwNzk4MyAxNC44NjY5ODY4LDMuOTk0NDAwNCBDMTQuODY2OTg2OCw0LjM0MDc3ODY0IDE0Ljk2MzAxMzUsNC42NTc0MzQ2NiAxNS4xNTUwNjY4LDQuOTQyMDgyMTIgQzE1LjM2NDI2NzgsNS4yNTQxNjU0OCAxNS42NTAwNjE1LDUuNDcxMzY2MzYgMTYuMDEyNDQ3OCw1LjU5NTk3MTA1IEwxNi43MzI2NDc5LDUuODQxNzUwOTggQzE3LjQ0MTQxNjIsNi4wODI5NTgyOCAxNy45MTY5NzY5LDYuNTU4NTEzODYgMTguMTU4MTg2Nyw3LjI2NjEzMTQ2IEwxOC40MDM5NjkzLDcuOTg3NDY3IEMxOC41Mjg1NzUzLDguMzQ5ODQ5NSAxOC43NDY5MjE3LDguNjM1NjQwMTMgMTkuMDU3ODY1Miw4Ljg0NDgzODg3IEMxOS4zNDM2NTg5LDkuMDM2ODkwMTcgMTkuNjU5MTc1MSw5LjEzMjkxNTgyIDIwLjAwNTU1Nyw5LjEzMjkxNTgyIEMyMC4zNTE5Mzg5LDkuMTMyOTE1ODIgMjAuNjY4NTk4Myw5LjAzNjg5MDE3IDIwLjk1MzI0ODgsOC44NDQ4Mzg4NyBDMjEuMjYxMjg3OCw4LjY0MDU2MjMzIDIxLjQ5MTYxNTQsOC4zMzg1NjI2NSAyMS42MDcxNDQ3LDcuOTg3NDY3IEwyMS44NTI5MjczLDcuMjY3Mjc0NjMgQzIxLjk5MDEwODIsNi44NjI1OTUxMSAyMi4yMDM4ODE5LDYuNTM1NjUwNjIgMjIuNDkzMTA1MSw2LjI4NDE1NDg3IEMyMi42MTMxMzg1LDYuMTc4OTgzOTMgMjIuNzkyNjE2OSw2LjI0OTg1OTk5IDIyLjgxMzE5NCw2LjQwODc1OTU5IEMyMi44NDc0ODkzLDYuNjQ1Mzk0MjIgMjIuODYzNDkzNyw2Ljg4ODg4NzgzIDIyLjg2MzQ5MzcsNy4xMzgwOTcyNSBMMjIuODYzNDkzNywxNi44NTQ5Nzg1IEMyMi44NjM0OTM3LDE4LjE5NzA1MTIgMjIuMzg5MDc2MiwxOS4zNDEzNTY5IDIxLjQ0MDI0MTIsMjAuMjkwMTgxNyBDMjAuNDkxNDA2MywyMS4yMzkwMDY2IDE5LjM0NzA4ODQsMjEuNzEzNDE5IDE4LjAwNTAwMTMsMjEuNzEzNDE5IEwxMi4zMjU3MDk1LDIxLjcxMzQxOSBDMTEuODU3MDA3OCwyMS43MTM0MTkgMTEuNDExMTY5NywyMS44MTI4NzQyIDEwLjk4ODE5NTEsMjIuMDEyOTI3NiBMNi45Mzc5MjcxNywyMy45MTg1Nzk1IEM2LjY3MjMxMDIsMjQuMDQzNDA4MiA2LjM2MTI5ODYyLDI0LjAyMzcwMjYgNi4xMTM1NjEwMywyMy44NjYzNDgxIEM1Ljg2NTgyMzQ0LDIzLjcwODk5MzUgNS43MTU3ODY0MSwyMy40MzU4NTY1IDUuNzE1ODczNDQsMjMuMTQyMzcyMiBMNS43MTU4NzM0NCwyMi4yODUwMDAzIEM1LjcxNTg3MzQ1LDIyLjEzMzQwNzUgNS42NTU2NTI4MiwyMS45ODgwMjM2IDUuNTQ4NDU5MzksMjEuODgwODMxMyBDNS40NDEyNjU5NywyMS43NzM2MzkgNS4yOTU4ODA0OCwyMS43MTM0MTkgNS4xNDQyODYwOCwyMS43MTM0MTkgTDQuODU4NDkyNDMsMjEuNzEzNDE5IEMzLjUxNjQwNTM0LDIxLjcxMzQxOSAyLjM3MjA4NzQ5LDIxLjIzOTAwNjYgMS40MjMyNTI0OCwyMC4yOTAxODE3IEMwLjQ3NDQxNzUwMywxOS4zNDEzNTY5IDAsMTguMTk3MDUxMiAwLDE2Ljg1NDk3ODUgTDAsNy4xMzgwOTcyNSBDMCw1Ljc5NjAyNDQ3IDAuNDc0NDE3NTAzLDQuNjUxNzE4ODIgMS40MjMyNTI0OCwzLjcwMjg5Mzk2IEMyLjM3MjA4NzQ5LDIuNzU0MDY5MSAzLjUxNjQwNTM0LDIuMjc5NjU2NjYgNC44NTg0OTI0MywyLjI3OTY1NjY2IEwxNS42NTY5MjA1LDIuMjc5NjU2NjYgWiBNOS45MDU2MDg2Niw3LjgzMDg1MzcyIEM5LjI2ODg2MDM3LDcuODMwODUzNzIgOC44NzIxNzg3Myw4LjEzMjY0ODYyIDguNjM3ODI3OTQsOC43ODUzOTQ0MSBMNi40MzgzNTk4NCwxNC43NzU1NjU5IEM2LjM2NjMzOTgzLDE0Ljk4MTMzNTEgNi4zMjc0NzE4OCwxNS4xNzExMDAxIDYuMzI3NDcxODgsMTUuMzEwNTY1OSBDNi4zMjc0NzE4OCwxNS43OTY0MSA2LjY1NjcwNjE5LDE2LjEwMzkyMDcgNy4xODE0MjMzNywxNi4xMDM5MjA3IEM3LjYyNzI2MTUsMTYuMTAzOTIwNyA3Ljg3ODc1OTk0LDE1Ljg4MTAwNCA4LjAzNTM3NDg2LDE1LjM0NDg2MDggTDguNDU4MzQ5NTEsMTQuMDg4NTI1MiBMMTEuMzY3NzI5MSwxNC4wODg1MjUyIEwxMS43OTA3MDM3LDE1LjM2MDg2NTEgQzExLjk0Mjc0NTksMTUuODg2NzE5OCAxMi4xOTMxMDEyLDE2LjEwMzkyMDcgMTIuNjY4NjYxOSwxNi4xMDM5MjA3IEMxMy4xNjAyMjcsMTYuMTAzOTIwNyAxMy41MTExODE2LDE1Ljc3NDY4OTkgMTMuNTExMTgxNiwxNS4zMTA1NjU5IEMxMy41MTExODE2LDE1LjE0MzY2NDIgMTMuNDgyNjAyMiwxNC45OTI3NjY4IDEzLjQwNDg2NjQsMTQuNzc1NTY1OSBMMTEuMTkzOTY2NSw4Ljc4MDgyMTc1IEMxMC45NTM4OTk4LDguMTIxMjE2OTggMTAuNTY0MDc3Myw3LjgzMTk5Njg5IDkuOTA1NjA4NjYsNy44MzE5OTY4OSBMOS45MDU2MDg2Niw3LjgzMDg1MzcyIFogTTE1LjM3NTY5OTUsNy44MzA4NTM3MiBDMTQuODQ1MjY2NSw3LjgzMDg1MzcyIDE0LjUzMjAzNjYsOC4xNTU1MTE4NiAxNC41MzIwMzY2LDguNzEzMzc1MTcgTDE0LjUzMjAzNjYsMTUuMjI3MTE1MSBDMTQuNTMyMDM2NiwxNS43ODA0MDU3IDE0Ljg0NTI2NjUsMTYuMTAzOTIwNyAxNS4zNzU2OTk1LDE2LjEwMzkyMDcgQzE1LjkwNjEzMjYsMTYuMTAzOTIwNyAxNi4yMTgyMTkzLDE1Ljc4MDQwNTcgMTYuMjE4MjE5MywxNS4yMjcxMTUxIEwxNi4yMTgyMTkzLDguNzEzMzc1MTcgQzE2LjIxODIxOTMsOC4xNTU1MTE4OSAxNS45MDYxMzI2LDcuODMwODUzNzIgMTUuMzc1Njk5NSw3LjgzMDg1MzcyIFogTTkuOTExMzI0NTIsOS40ODM4NjY2OSBMMTAuOTc2NzYzMywxMi43ODMwMzM2IEw4LjgyNzU5NDkyLDEyLjc4MzAzMzYgTDkuODcxMzEzNDIsOS40ODM4NjY2OSBMOS45MTAxODEzNiw5LjQ4Mzg2NjY5IEw5LjkxMTMyNDUyLDkuNDgzODY2NjkgWiBNMjAuNTI0NTU4MywwLjM3MDU3NTMwMyBMMjAuNzcxNDg0LDEuMDkwNzY3NjcgQzIxLjExNDU5NjMsMi4wOTU5MTUzNSAyMS45MDQwNjIzLDIuODg1MzcyOTMgMjIuOTA5MjIwNywzLjIyODQ4MTUyIEwyMy42Mjk0MjA3LDMuNDc1NDA0NjIgQzIzLjg1MTExNjksMy41NTE0OTk5MSAyNCwzLjc2MDAxMDQ2IDI0LDMuOTk0NDAwNCBDMjQsNC4yMjg3OTAzNCAyMy44NTExMTY5LDQuNDM3MzAwODkgMjMuNjI5NDIwNyw0LjUxMzM5NjE4IEwyMi45MDkyMjA3LDQuNzYwMzE5MjggQzIxLjkwNDA2MjMsNS4xMDM0Mjc4NyAyMS4xMTQ1OTYzLDUuODkyODg1NDUgMjAuNzcxNDg0LDYuODk4MDMzMTMgTDIwLjUyNDU1ODMsNy42MTgyMjU1IEMyMC40Nzg5NDY3LDcuNzU1OTA2MzIgMjAuMzgwMjU2MSw3Ljg2OTY4MDU1IDIwLjI1MDM5OTEsNy45MzQyODYzOCBDMjAuMTIwNTQyMiw3Ljk5ODg5MjIxIDE5Ljk3MDI2NjIsOC4wMDg5ODI3IDE5LjgzMjkzNzYsNy45NjIzMTc0MiBDMTkuNjY4NDE0LDcuOTEwNzMzNDQgMTkuNTM5MjI4Niw3Ljc4MjQwMjEgMTkuNDg2NTU1Nyw3LjYxODIyNTUgTDE5LjIzOTYzLDYuODk4MDMzMTMgQzE4Ljg5NjY2OTIsNS44OTI3OTEwNSAxOC4xMDcxNDYxLDUuMTAzMjc2MzMgMTcuMTAxODkzMyw0Ljc2MDMxOTI4IEwxNi4zODE2OTMzLDQuNTEzMzk2MTggQzE2LjEwMDMwOTcsNC40MTg3MjA3OCAxNS45NDU5OTksNC4xMTY3MDEzNyAxNi4wMzQxNjgxLDMuODMzMjE0NDkgQzE2LjA4MzU2NTcsMy42NjM3Mjk1IDE2LjIxMzcxOTQsMy41Mjk3MjQgMTYuMzgxNjkzMywzLjQ3NTQwNDYyIEwxNy4xMDE4OTMzLDMuMjI4NDgxNTIgQzE4LjEwNzMzNTEsMi44ODU4Mjc5NCAxOC44OTY5NzI3LDIuMDk2MTk4NzUgMTkuMjM5NjMsMS4wOTA3Njc2NyBMMTkuNDg2NTU1NywwLjM3MDU3NTMwMyBDMTkuNTYyNjUxOCwwLjE0ODg4MTQ4MiAxOS43NzExNjQ2LDAgMjAuMDA1NTU3LDAgQzIwLjIzOTk0OTQsMCAyMC40NDg0NjIyLDAuMTQ4ODgxNDgyIDIwLjUyNDU1ODMsMC4zNzA1NzUzMDMgTDIwLjUyNDU1ODMsMC4zNzA1NzUzMDMgWiIgaWQ9IuW9oueKtiI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';
  var BRAND_TOGGLE_ICON = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTVweCIgaGVpZ2h0PSIxM3B4IiB2aWV3Qm94PSIwIDAgMTUgMTMiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+aWNvbl/lsZXlvIBAMng8L3RpdGxlPgogICAgPGcgaWQ9IuWchuaWueaPkuS7ti3mlbDmja7pm4bmmbrog73liqnmiYsiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJpY29uX+WxleW8gCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNy4yNSwgNi4wNDYzKSBzY2FsZSgtMSwgMSkgdHJhbnNsYXRlKC03LjI1LCAtNi4wNDYzKSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1ydWxlPSJub256ZXJvIj4KICAgICAgICAgICAgPHBhdGggZD0iTTEzLjc1LDQuNTQ3NDczNTFlLTEzIEMxNC4xNjQyMTM2LDQuNTQ3NDczNTFlLTEzIDE0LjUsMC4zMzU3ODY0MzggMTQuNSwwLjc1IEMxNC41LDEuMTY0MjEzNTYgMTQuMTY0MjEzNiwxLjUgMTMuNzUsMS41IEwwLjc1LDEuNSBDMC4zMzU3ODY0MzgsMS41IDAsMS4xNjQyMTM1NiAwLDAuNzUgQzAsMC4zMzU3ODY0MzggMC4zMzU3ODY0MzgsNC41NDc0NzM1MWUtMTMgMC43NSw0LjU0NzQ3MzUxZS0xMyBMMTMuNzUsNC41NDc0NzM1MWUtMTMgWiBNMy41Nzc2NDU0NywzLjIxMDUwMzk4IEMzLjg3MDk1NzYyLDMuNTAyOTc3NjggMy44NzE2MzczMSwzLjk3Nzg1MDkzIDMuNTc5MTYzNjEsNC4yNzExNjMwNyBMMi41NTYsNS4yOTYgTDEzLjc1LDUuMjk2Mjk2MyBDMTQuMTY0MjEzNiw1LjI5NjI5NjMgMTQuNSw1LjYzMjA4MjczIDE0LjUsNi4wNDYyOTYzIEMxNC41LDYuNDYwNTA5ODYgMTQuMTY0MjEzNiw2Ljc5NjI5NjMgMTMuNzUsNi43OTYyOTYzIEwyLjU1Nyw2Ljc5NiBMMy41NzkxNjM2MSw3LjgyMTM0ODA0IEMzLjg0NTA0ODc5LDguMDg3OTk1NDQgMy44Njg2NTg0NCw4LjUwNDY5MzM1IDMuNjUwMzgzOTUsOC43OTc5OTI3MiBMMy41Nzc2NDU0Nyw4Ljg4MjAwNzEzIEMzLjI4NDMzMzMzLDkuMTc0NDgwODMgMi44MDk0NjAwOSw5LjE3MzgwMTEzIDIuNTE2OTg2MzksOC44ODA0ODg5OSBMMC4yMTg5MTEzODksNi41NzU4MjYwMyBDMC4xOTA2ODkzNDYsNi41NDY5MjMxNCAwLjE3MDU0NzEwNyw2LjUyMzQ5MjI4IDAuMTUxODg5ODYzLDYuNDk4ODczOTIgTDAuMjE4OTExMzg5LDYuNTc1ODI2MDMgQzAuMTgyNzU0MTk3LDYuNTM5NTY1MTggMC4xNTEwNzYwMTcsNi41MDA1MjcwNyAwLjEyMzg3Njg1LDYuNDU5Mzk5NzYgQzAuMTE0NDgxMTAxLDYuNDQ1MTI2NjUgMC4xMDUzNzkzOTYsNi40MzAyNzc3IDAuMDk2NzkxNDE2MSw2LjQxNTA5OTcxIEMwLjA4OTM1OTQ4MTgsNi40MDIwMTY2OSAwLjA4MjUxMjgyNjksNi4zODkwMDQ0IDAuMDc2MDc0Nzk4Miw2LjM3NTg0Mjc0IEMwLjA2NjM0Mzc3ODIsNi4zNTU5NzkzMSAwLjA1NzI3NTU3MjcsNi4zMzUxNzA4NSAwLjA0OTE0ODA5ODIsNi4zMTM4OTc0NyBDMC4wNDU2MjgyOTE0LDYuMzA0NTU4MzYgMC4wNDIzOTc0NTkzLDYuMjk1NTUxMTcgMC4wMzkzNDQzMjA5LDYuMjg2NDk3MjYgQzAuMDMxNzQ2OTE0OCw2LjI2NDI0MTU5IDAuMDI1MDU4OTM1MSw2LjI0MDgzMDcxIDAuMDE5NTA4NjIxMSw2LjIxNjk4MzA3IEMwLjAxNjk2Njk4MjMsNi4yMDU2ODMxNyAwLjAxNDczNzI2OSw2LjE5NTAwODk5IDAuMDEyNzQxOTA4Miw2LjE4NDI5OTc1IEMwLjAwODkzOTg0NDgyLDYuMTY0MzI3MTIgMC4wMDU5NDU3Nzc1Nyw2LjE0MzUzNDU1IDAuMDAzODIyMTE5NjQsNi4xMjI0ODUwMiBDMC4wMDE4NjQ0OTU0Myw2LjEwMjg0MjU2IDAuMDAwNjQwNzUzMDMzLDYuMDgzMDk3NDcgMC4wMDAxOTMzNjMzNDEsNi4wNjMzMzgwOCBDNi40NzczNjE4NGUtMDUsNi4wNTc3ODcxIDAsNi4wNTIwNDkyNiAwLDYuMDQ2Mjk2MyBMMC4wMDAxOTMzNjMzNDEsNi4wMjkxNzMwMyBDMC4wMDA2NDA3NTMwMzMsNi4wMDk0MTM2NCAwLjAwMTg2NDQ5NTQzLDUuOTg5NjY4NTUgMC4wMDM4NjQ1OTA1Miw1Ljk2OTk4NzQzIEwwLDYuMDQ2Mjk2MyBDMCw1Ljk5ODc0NjI3IDAuMDA0NDI1MDI4MjIsNS45NTIyMjk3NiAwLjAxMjg4NTc1MzQsNS45MDcxMzYxMSBDMC4wMTQ3NDczNzU4LDUuODk3NTIzODIgMC4wMTY3NTk3MTI2LDUuODg3ODU2MjQgMC4wMTg5NjQyNTMyLDUuODc4MjIzNzQgQzAuMDI0NzU4MTIxLDUuODUyNjUwNSAwLjAzMTkzNTg4OTYsNS44Mjc1MjQ3OSAwLjA0MDM1MTgyNDEsNS44MDI5NzM5OSBDMC4wNDI5ODkzMDEzLDUuNzk1MzMyNiAwLjA0NTc1NDY1NzEsNS43ODc2NTY2MSAwLjA0ODY0OTE3Niw1Ljc4MDAxODM3IEMwLjA1NzI1OTk1NTQsNS43NTczNDMzNCAwLjA2NjkxMzg0NzcsNS43MzUyNTUxMyAwLjA3NzU2ODg5OTcsNS43MTM3NTEwNiBDMC4wODMwMDI3NjM1LDUuNzAyNjQ2NDQgMC4wODg3NjE4NjA1LDUuNjkxNjk1ODMgMC4wOTQ4MTAzNTg5LDUuNjgwODYzMzIgQzAuMTA1MDU5NjQ3LDUuNjYyNjU1OTcgMC4xMTYyMTEwMTksNS42NDQ1NDQ3NCAwLjEyODA4ODIyMSw1LjYyNjk2NDE2IEMwLjEzNTY5OTk5Myw1LjYxNTU1MTYzIDAuMTQzNjg5NjQyLDUuNjA0NDAwMjIgMC4xNTIwMjE3OTgsNS41OTM0MjU3OCBDMC4xNzI2OTc3OTgsNS41NjYyNjI0NiAwLjE5NTM1MjgyMiw1LjU0MDI4MzMgMC4yMTk2Njk5MTQsNS41MTU5NjYyMSBMMi41MTY5ODYzOSwzLjIxMjAyMjEyIEMyLjgwOTQ2MDA5LDIuOTE4NzA5OTggMy4yODQzMzMzMywyLjkxODAzMDI4IDMuNTc3NjQ1NDcsMy4yMTA1MDM5OCBaIE0xMy43NSwxMC41OTI1OTI2IEMxNC4xNjQyMTM2LDEwLjU5MjU5MjYgMTQuNSwxMC45MjgzNzkgMTQuNSwxMS4zNDI1OTI2IEMxNC41LDExLjc1NjgwNjIgMTQuMTY0MjEzNiwxMi4wOTI1OTI2IDEzLjc1LDEyLjA5MjU5MjYgTDAuNzUsMTIuMDkyNTkyNiBDMC4zMzU3ODY0MzgsMTIuMDkyNTkyNiAwLDExLjc1NjgwNjIgMCwxMS4zNDI1OTI2IEMwLDEwLjkyODM3OSAwLjMzNTc4NjQzOCwxMC41OTI1OTI2IDAuNzUsMTAuNTkyNTkyNiBMMTMuNzUsMTAuNTkyNTkyNiBaIiBpZD0i5b2i54q257uT5ZCIIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=';
  var ANALYSIS_ICON = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjBweCIgaGVpZ2h0PSIxOHB4IiB2aWV3Qm94PSIwIDAgMjAgMTgiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+aWNvbl9BSeaVsOaNruWIhuaekOWKqeaJi0AyeDwvdGl0bGU+CiAgICA8ZyBpZD0i5ZyG5pa55o+S5Lu2LeaVsOaNrumbhuaZuuiDveWKqeaJiyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9Imljb25fQUnmlbDmja7liIbmnpDliqnmiYsiIGZpbGw9IiMwMDAwMDAiIGZpbGwtcnVsZT0ibm9uemVybyI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMi4zMTI2OTI5LDEuODMxMDA0NDYgQzEyLjcyNjkwNjUsMS44MzEwMDQ0NiAxMy4wNjI2OTI5LDIuMTY2NzkwOSAxMy4wNjI2OTI5LDIuNTgxMDA0NDYgQzEzLjA2MjY5MjksMi45OTUyMTgwMiAxMi43MjY5MDY1LDMuMzMxMDA0NDYgMTIuMzEyNjkyOSwzLjMzMTAwNDQ2IEwzLjY4MDQwMjkzLDMuMzMxMDA0NDYgQzMuMTE5MDEwOTgsMy4zMzEwMDQ0NiAyLjY3MjE2MTE3LDMuNzY1NzA3MTYgMi42NzIxNjExNyw0LjI5MTQ1MDM3IEwyLjY3MiwxMS42NjYgTDUuOTQ4NzE0MjMsMTEuNjY2MDY4NSBDNi4yNTQ0MTE2MSwxMS42NjYwNjg1IDYuNTUwNzUwNzMsMTEuNzcxNTIzOSA2Ljc4NzcyNTg0LDExLjk2NDYzOTYgTDguMDYyLDEzLjAwMzA2ODUgTDExLjU3NCwxMy4wMDMwNjg1IEwxMy4wNTAwNjMsMTEuOTIyNzU1NyBDMTMuMjM5ODAyOCwxMS43ODM3NzQgMTMuNDYyMzI2OCwxMS42OTgxNzM1IDEzLjY5NDU2MTMsMTEuNjczNTAwNSBMMTMuODM0ODgyNywxMS42NjYwNjg1IEwxNi45OTYsMTEuNjY2IEwxNi45OTYzMzcsNy4wOTY3NjQ3NSBDMTYuOTk2MzM3LDYuNjgyNTUxMTkgMTcuMzMyMTIzNCw2LjM0Njc2NDc1IDE3Ljc0NjMzNyw2LjM0Njc2NDc1IEMxOC4xNjA1NTA2LDYuMzQ2NzY0NzUgMTguNDk2MzM3LDYuNjgyNTUxMTkgMTguNDk2MzM3LDcuMDk2NzY0NzUgTDE4LjQ5NiwxMS42NjYgTDE4Ljc3NTk1MTEsMTEuNjY2MDY4NSBDMTkuMzQ5ODEyMSwxMS42NjYwNjg1IDE5LjgxNTAxODMsMTIuMTMxMjc0NyAxOS44MTUwMTgzLDEyLjcwNTEzNTcgTDE5LjgxNTAxODMsMTUuMTAwMzE3MiBDMTkuODE1MDE4MywxNi40NzI0MTUyIDE4LjcwMjcxMzEsMTcuNTg0NzIwNCAxNy4zMzA2MTUxLDE3LjU4NDcyMDQgTDIuNDg0NDAzMjIsMTcuNTg0NzIwNCBDMS4xMTIzMDUyMSwxNy41ODQ3MjA0IDAsMTYuNDcyNDE1MiAwLDE1LjEwMDMxNzIgTDAsMTIuNzA1MTM1NyBDMCwxMi4xMzEyNzQ3IDAuNDY1MjA2MjMzLDExLjY2NjA2ODUgMS4wMzkwNjcyLDExLjY2NjA2ODUgTDEuMTcyLDExLjY2NiBMMS4xNzIxNjExNyw0LjI5MTQ1MDM3IEMxLjE3MjE2MTE3LDIuOTI3ODg3MiAyLjI5OTY5NDY2LDEuODMxMDA0NDYgMy42ODA0MDI5MywxLjgzMTAwNDQ2IEwxMi4zMTI2OTI5LDEuODMxMDA0NDYgWiBNNS44ODgsMTMuMTY2MDY4NSBMMS41LDEzLjE2NjA2ODUgTDEuNSwxNS4xMDAzMTcyIEMxLjUsMTUuNjA1MTU0NSAxLjg4MDAxOTIxLDE2LjAyMTIzMzUgMi4zNjk2MDEwMSwxNi4wNzgwOTc2IEwyLjQ4NDQwMzIyLDE2LjA4NDcyMDQgTDE3LjMzMDYxNTEsMTYuMDg0NzIwNCBDMTcuODc0Mjg2LDE2LjA4NDcyMDQgMTguMzE1MDE4MywxNS42NDM5ODgxIDE4LjMxNTAxODMsMTUuMTAwMzE3MiBMMTguMzE1MDE4MywxMy4xNjYwNjg1IEwxMy44OSwxMy4xNjYwNjg1IEwxMi40MTUwNzUxLDE0LjI0NzIzMTEgQzEyLjIyNTMzNTMsMTQuMzg2MjEyNyAxMi4wMDI4MTE0LDE0LjQ3MTgxMzMgMTEuNzcwNTc2OCwxNC40OTY0ODYyIEwxMS42MzAyNTU0LDE0LjUwMzkxODMgTDguMDAxODc5NTUsMTQuNTAzOTE4MyBDNy42OTYxODIxNywxNC41MDM5MTgzIDcuMzk5ODQzMDUsMTQuMzk4NDYyOSA3LjE2Mjg2Nzk0LDE0LjIwNTM0NzIgTDUuODg4LDEzLjE2NjA2ODUgWiBNOS42NTUzNzI1NSw1LjY1MTk1MTA4IEwxMC44NjI0NzUyLDguNzY4OTgxIEwxMS42NTQ1NDkzLDcuNjgxMzczMTMgQzExLjc3NTUyNCw3LjUxNTA2ODU5IDExLjk1ODQzODcsNy40MDY5NzcyNCAxMi4xNTkzMjEzLDcuMzc5NDg3OTcgTDEyLjI2MTA1NjMsNy4zNzI1NjM4MiBMMTMuMTEzMzE1NSw3LjM3MjU2MzgyIEMxMy41Mjc1MjkxLDcuMzcyNTYzODIgMTMuODYzMzE1NSw3LjcwODM1MDI2IDEzLjg2MzMxNTUsOC4xMjI1NjM4MiBDMTMuODYzMzE1NSw4LjUzNjc3NzM5IDEzLjUyNzUyOTEsOC44NzI1NjM4MiAxMy4xMTMzMTU1LDguODcyNTYzODIgTDEyLjY0MjQ3NTIsOC44NzE5ODEgTDExLjI2NzUyMzQsMTAuNzYzMzM3MyBDMTAuOTQwMTMxNCwxMS4yMTM0MDQ3IDEwLjI2NzQ1NSwxMS4xNTY1NDQ0IDEwLjAwNzg4MjIsMTAuNjkxNTgxMyBMOS45NjE3MDA0NCwxMC41OTMxNzY2IEw4Ljc3ODQ3NTE2LDcuNTM5OTgxIEw4LjA1NTE3MjAzLDguNjI3NjE5NDkgQzcuOTM1OTU3MDYsOC44MDY1MzgwOCA3Ljc0Njg0MTk3LDguOTI0MjIyMTEgNy41MzcyODQ0NSw4Ljk1NDE5NDcxIEw3LjQzMTAzMTEzLDguOTYxNzQ5MTUgTDYuNTI2NDc1MTYsOC45NjE3NDkxNSBDNi4xMTIyNjE1OSw4Ljk2MTc0OTE1IDUuNzc2NDc1MTYsOC42MjU5NjI3MiA1Ljc3NjQ3NTE2LDguMjExNzQ5MTUgQzUuNzc2NDc1MTYsNy43OTc1MzU1OSA2LjExMjI2MTU5LDcuNDYxNzQ5MTUgNi41MjY0NzUxNiw3LjQ2MTc0OTE1IEw3LjAyOTQ3NTE2LDcuNDYwOTgxIEw4LjMzMTkxNTcyLDUuNTA3MTEwNjYgQzguNjY4ODUzMDYsNS4wMDE0MzI5MSA5LjQzNTc4NDYzLDUuMDg1MzY2NjUgOS42NTUzNzI1NSw1LjY1MTk1MTA4IFogTTE2Ljg0NzA5NjgsMC4wMTg5NDc2NjM0IEMxNi45ODUyNDQ1LDAuMDYxMDQ4MjYzMiAxNy4wOTMzNjM0LDAuMTY5MTY3MTUxIDE3LjEzNTQ2NCwwLjMwNzMxNDg2NyBMMTcuNTczNTA5NSwxLjc0NDcwNTE0IEMxNy42MTYyODMyLDEuODg1MDYxNCAxNy43MjcxMzg0LDEuOTk0MjYzNzUgMTcuODY4MTIxMywyLjAzNDkyNDI1IEwxOS4zMDU0NDU1LDIuNDQ5NDU4ODcgQzE5LjUzNTUzODMsMi41MTU4MTkyOSAxOS42NjgyNjk2LDIuNzU2MTQyMTMgMTkuNjAxOTA5MiwyLjk4NjIzNDk2IEMxOS41NjA2MDc3LDMuMTI5NDQwNTQgMTkuNDQ4NjUxMSwzLjI0MTM5NzE3IDE5LjMwNTQ0NTUsMy4yODI2OTg2OSBMMTcuODY4MTIxMywzLjY5NzIzMzMxIEMxNy43MjcxMzg0LDMuNzM3ODkzOCAxNy42MTYyODMyLDMuODQ3MDk2MTYgMTcuNTczNTA5NSwzLjk4NzQ1MjQyIEwxNy4xMzU0NjQsNS40MjQ4NDI2OSBDMTcuMDY1NjU0Nyw1LjY1MzkxMjczIDE2LjgyMzM2NTIsNS43ODMwMTkxMyAxNi41OTQyOTUyLDUuNzEzMjA5ODkgQzE2LjQ1NjE0NzUsNS42NzExMDkyOSAxNi4zNDgwMjg2LDUuNTYyOTkwNDEgMTYuMzA1OTI4LDUuNDI0ODQyNjkgTDE1Ljg2Nzg4MjQsMy45ODc0NTI0MiBDMTUuODI1MTA4OCwzLjg0NzA5NjE2IDE1LjcxNDI1MzUsMy43Mzc4OTM4IDE1LjU3MzI3MDYsMy42OTcyMzMzMSBMMTQuMTM1OTQ2NSwzLjI4MjY5ODY5IEMxMy45MDU4NTM2LDMuMjE2MzM4MjYgMTMuNzczMTIyMywyLjk3NjAxNTQyIDEzLjgzOTQ4MjcsMi43NDU5MjI2IEMxMy44ODA3ODQyLDIuNjAyNzE3MDEgMTMuOTkyNzQwOSwyLjQ5MDc2MDM5IDE0LjEzNTk0NjUsMi40NDk0NTg4NyBMMTUuNTczMjcwNiwyLjAzNDkyNDI1IEMxNS43MTQyNTM1LDEuOTk0MjYzNzUgMTUuODI1MTA4OCwxLjg4NTA2MTQgMTUuODY3ODgyNCwxLjc0NDcwNTE0IEwxNi4zMDU5MjgsMC4zMDczMTQ4NjcgQzE2LjM3NTczNzIsMC4wNzgyNDQ4MjQ0IDE2LjYxODAyNjcsLTAuMDUwODYxNTcwMyAxNi44NDcwOTY4LDAuMDE4OTQ3NjYzNCBaIiBpZD0i5b2i54q257uT5ZCIIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=';

  var CSS = [
    '#gdshell-btn{position:fixed;right:32px;bottom:32px;width:52px;height:52px;border:0;border-radius:50%;',
    'display:none;align-items:center;justify-content:center;background:#065bce;color:#fff;cursor:pointer;z-index:9997;',
    'box-shadow:0 4px 16px rgba(6,91,206,.28);font-size:14px;font-weight:600;transition:transform .2s,box-shadow .2s}',
    '#gdshell-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(6,91,206,.36)}',
    '#gdshell-overlay{position:fixed;inset:0;background:rgba(0,0,0,.16);opacity:0;pointer-events:none;',
    'transition:opacity .25s;z-index:9998}',
    '#gdshell-overlay.open{opacity:1;pointer-events:auto}',
    '#gdshell-drawer{position:fixed;top:101px;right:0;bottom:0;width:min(800px,calc(100vw - 24px));display:flex;',
    'background:#fff;transform:translateX(100%);transition:transform .25s;z-index:9999;',
    'box-shadow:-2px 0 12px rgba(0,0,0,.10);font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif;',
    'color:#202020;overflow:hidden}',
    '#gdshell-drawer.open{transform:translateX(0)}',
    '#gdshell-drawer *,#gdshell-drawer *::before,#gdshell-drawer *::after{box-sizing:border-box}',
    '#gdshell-sidebar{width:180px;display:flex;flex-direction:column;flex:none;background:#fff;border-right:1px solid #f0f0f0}',
    '#gdshell-brand{height:76px;display:flex;align-items:center;padding:0 14px;gap:8px;font-size:16px;font-weight:600;',
    'border-bottom:1px solid #f5f5f5;white-space:nowrap}',
    '#gdshell-brand-mark{width:24px;height:24px;flex:none}',
    '#gdshell-brand-toggle-frame{width:26px;height:26px;display:grid;place-items:center;flex:none;margin-left:10px;border:1px solid #d9d9d9;border-radius:4px;background:transparent}',
    '#gdshell-brand-toggle{width:16px;height:16px;object-fit:contain}',
    '#gdshell-tabs{display:flex;flex:1;flex-direction:column;gap:4px;padding:28px 10px;overflow-y:auto}',
    '.gdshell-tab{position:relative;width:100%;min-height:44px;padding:0 14px 0 40px;border:0;border-radius:4px;background:transparent;',
    'color:#202020;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;transition:background .15s,color .15s}',
    '.gdshell-tab::before{content:"";position:absolute;left:16px;top:50%;width:15px;height:15px;transform:translateY(-50%);border:1.5px solid currentColor;border-radius:3px;opacity:.72}',
    '.gdshell-tab:hover{background:#f7f7f7}',
    '.gdshell-tab.active{background:#f2f2f2;color:#202020;font-weight:600}',
    '.gdshell-tab.gdshell-tab-analysis.active::before{width:20px;height:18px;border:0;border-radius:0;opacity:1;background:url("' + ANALYSIS_ICON + '") center/contain no-repeat}',
    '.gdshell-tab:disabled{cursor:not-allowed;color:#bfbfbf}',
    '#gdshell-exit{height:64px;display:flex;align-items:center;gap:10px;padding:0 20px;border:0;border-top:1px solid #f0f0f0;background:#fff;',
    'color:#202020;cursor:pointer;text-align:left;font-size:14px}',
    '#gdshell-exit::before{content:"↪";font-size:22px;font-weight:300;line-height:1}',
    '#gdshell-workspace{display:flex;flex:1;min-width:0;flex-direction:column;background:#fafbfd}',
    '#gdshell-content{position:relative;flex:1;min-height:0;overflow:hidden;background:#fafbfd}',
    '.gdshell-pane{position:absolute;inset:12px;display:none;overflow:hidden;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.20)}',
    '.gdshell-pane.active{display:block}',
    '.gdshell-root{width:100%;height:100%;overflow:hidden}',
    '.gdshell-state{height:100%;display:flex;align-items:center;justify-content:center;padding:24px;',
    'text-align:center;color:#8c8c8c;font-size:13px}',
    '.gdshell-error{color:#cf1322}',
    '@media(max-width:720px){#gdshell-drawer{top:0;width:100vw}#gdshell-sidebar{width:152px}#gdshell-brand{font-size:14px}#gdshell-tabs{padding:20px 8px}.gdshell-tab{padding-left:34px}#gdshell-btn{right:18px;bottom:18px}}',
  ].join('');

  var tabs = {};
  var activeId = null;
  var currentContext = null;
  var currentDatasetId = null;
  var ui = {};
  var userPromise = null;
  var tokenPromise = null;

  function parseDatasetId(pathname) {
    var match = (pathname || location.pathname).match(/\/data-center\/data-sets\/[^/]+\/([^/]+)\/details(?:\/|$)/);
    return match ? match[1] : null;
  }

  function getTestContext() {
    return window.__GD_DATASET_SCENE_TEST_CONTEXT__ || null;
  }

  async function getUser() {
    if (!userPromise) {
      userPromise = (async function () {
        if (typeof GD === 'undefined' || typeof GD.getUser !== 'function') return {};
        try {
          var value = await GD.getUser();
          return (value && value.$) || value || {};
        } catch (e) { return {}; }
      })();
    }
    return userPromise;
  }

  function getBiToken() {
    if (!tokenPromise) {
      tokenPromise = fetch('/api/user/token').then(function (response) {
        if (!response.ok) return '';
        return response.json().then(function (value) { return value.uIdToken || ''; });
      }).catch(function () { return ''; });
    }
    return tokenPromise;
  }

  async function makeContext(datasetId) {
    var test = getTestContext();
    if (test) {
      return Object.assign({
        datasetId: datasetId,
        pathname: location.pathname,
        pageOrigin: location.origin,
        user: {},
        getBiToken: function () { return Promise.resolve(''); },
      }, test);
    }
    return {
      datasetId: datasetId,
      pathname: location.pathname,
      pageOrigin: location.origin,
      user: await getUser(),
      getBiToken: getBiToken,
    };
  }

  function isAvailable(definition, context) {
    var availability = definition.availability || {};
    var roles = (context.user && context.user.role) || [];
    if (availability.roles && availability.roles.length &&
        !roles.some(function (role) { return availability.roles.indexOf(role) >= 0; })) return false;
    if (availability.domIds && availability.domIds.length &&
        availability.domIds.indexOf((context.user && context.user.domId) || '') < 0) return false;
    return true;
  }

  function renderState(tab, text, isError) {
    tab.root.innerHTML = '';
    var state = document.createElement('div');
    state.className = 'gdshell-state' + (isError ? ' gdshell-error' : '');
    state.textContent = text;
    tab.root.appendChild(state);
    return state;
  }

  function insertTabButton(button) {
    var children = ui.tabs.children;
    for (var index = 0; index < children.length; index++) {
      if (Number(children[index].dataset.order) > Number(button.dataset.order)) {
        ui.tabs.insertBefore(button, children[index]);
        return;
      }
    }
    ui.tabs.appendChild(button);
  }

  function addScene(definition) {
    if (!definition || tabs[definition.id]) return;
    if (definition.apiVersion !== 1 || typeof definition.mount !== 'function') {
      console.error('[dataset-shell] 场景协议不兼容：' + (definition.id || '(unknown)'));
      return;
    }

    var button = document.createElement('button');
    button.className = 'gdshell-tab';
    if (definition.title === '探索分析') button.classList.add('gdshell-tab-analysis');
    button.textContent = definition.title || definition.id;
    button.dataset.order = definition.order == null ? 99 : definition.order;

    var pane = document.createElement('section');
    pane.className = 'gdshell-pane';
    pane.setAttribute('role', 'tabpanel');
    var root = document.createElement('div');
    root.className = 'gdshell-root';
    pane.appendChild(root);
    ui.content.appendChild(pane);

    var tab = tabs[definition.id] = {
      definition: definition,
      button: button,
      pane: pane,
      root: root,
      status: 'registered',
      instance: null,
      controller: null,
    };
    button.onclick = function () { activate(definition.id); };
    insertTabButton(button);
    refreshVisibility();
  }

  async function mount(tab) {
    if (tab.status === 'mounted' || tab.status === 'mounting') return;
    tab.status = 'mounting';
    tab.button.disabled = true;
    var loadingState = renderState(tab, '场景加载中…', false);
    tab.controller = new AbortController();
    var controller = tab.controller;
    var context = Object.assign({}, currentContext, { abortSignal: controller.signal });
    try {
      var instance = await tab.definition.mount(tab.root, context);
      var normalized = typeof instance === 'function' ? { destroy: instance } : (instance || {});
      if (controller.signal.aborted || tab.controller !== controller || !currentContext) {
        if (typeof normalized.destroy === 'function') await normalized.destroy();
        return;
      }
      if (loadingState.parentNode) loadingState.remove();
      tab.instance = normalized;
      tab.status = 'mounted';
      tab.button.disabled = false;
      if (activeId === tab.definition.id && typeof tab.instance.activate === 'function') {
        tab.instance.activate();
      }
    } catch (error) {
      if (controller.signal.aborted || tab.controller !== controller || !currentContext) return;
      tab.status = 'error';
      tab.button.disabled = false;
      renderState(tab, '场景「' + (tab.definition.title || tab.definition.id) + '」加载失败：' +
        ((error && error.message) || '未知错误'), true);
      console.error('[dataset-shell] 场景挂载失败：' + tab.definition.id, error);
    }
  }

  function activate(id) {
    var next = tabs[id];
    if (!next || next.button.style.display === 'none') return;
    if (activeId && tabs[activeId] && activeId !== id) {
      var previous = tabs[activeId];
      previous.button.classList.remove('active');
      previous.pane.classList.remove('active');
      if (previous.instance && typeof previous.instance.deactivate === 'function') previous.instance.deactivate();
    }
    activeId = id;
    next.button.classList.add('active');
    next.pane.classList.add('active');
    if (next.status === 'registered') mount(next);
    else if (next.instance && typeof next.instance.activate === 'function') next.instance.activate();
  }

  function visibleTabs() {
    return Object.keys(tabs).map(function (id) { return tabs[id]; }).filter(function (tab) {
      return tab.button.style.display !== 'none';
    });
  }

  function refreshVisibility() {
    if (!currentContext) {
      ui.button.style.display = 'none';
      return;
    }
    Object.keys(tabs).forEach(function (id) {
      var tab = tabs[id];
      var visible = isAvailable(tab.definition, currentContext);
      tab.button.style.display = visible ? '' : 'none';
      if (!visible) tab.pane.classList.remove('active');
    });
    var visible = visibleTabs();
    ui.button.style.display = visible.length ? 'flex' : 'none';
    if ((!activeId || !tabs[activeId] || tabs[activeId].button.style.display === 'none') && visible.length) {
      activeId = visible[0].definition.id;
      visible[0].button.classList.add('active');
      visible[0].pane.classList.add('active');
      if (ui.drawer.classList.contains('open')) mount(visible[0]);
    }
  }

  function openShell() {
    ui.overlay.classList.add('open');
    ui.drawer.classList.add('open');
    if (activeId && tabs[activeId] && tabs[activeId].status === 'registered') mount(tabs[activeId]);
  }

  function closeShell() {
    ui.overlay.classList.remove('open');
    ui.drawer.classList.remove('open');
  }

  async function destroyScenes() {
    var jobs = Object.keys(tabs).map(async function (id) {
      var tab = tabs[id];
      if (tab.controller) tab.controller.abort();
      if (tab.instance && typeof tab.instance.destroy === 'function') {
        try { await tab.instance.destroy(); } catch (e) { console.error('[dataset-shell] 场景销毁失败：' + id, e); }
      }
      tab.instance = null;
      tab.controller = null;
      tab.status = 'registered';
      tab.button.disabled = false;
      tab.root.innerHTML = '';
      tab.pane.classList.remove('active');
      tab.button.classList.remove('active');
    });
    await Promise.all(jobs);
    activeId = null;
  }

  async function handleRoute(pathname) {
    var test = getTestContext();
    var datasetId = test ? (test.datasetId || 'preview-dataset') : parseDatasetId(pathname);
    if (!datasetId) {
      closeShell();
      ui.button.style.display = 'none';
      currentContext = null;
      currentDatasetId = null;
      tokenPromise = null;
      await destroyScenes();
      return;
    }
    if (currentDatasetId && currentDatasetId !== datasetId) await destroyScenes();
    currentDatasetId = datasetId;
    currentContext = await makeContext(datasetId);
    refreshVisibility();
  }

  function createUI() {
    var style = document.createElement('style');
    style.id = 'gdshell-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    ui.button = document.createElement('button');
    ui.button.id = 'gdshell-btn';
    ui.button.type = 'button';
    ui.button.textContent = 'AI';
    ui.button.title = '数据集智能场景';

    ui.overlay = document.createElement('div');
    ui.overlay.id = 'gdshell-overlay';

    ui.drawer = document.createElement('aside');
    ui.drawer.id = 'gdshell-drawer';
    ui.drawer.innerHTML =
      '<aside id="gdshell-sidebar">' +
      '  <div id="gdshell-brand">' +
      '    <img id="gdshell-brand-mark" src="' + BRAND_ICON + '" alt="">' +
      '    <span>数据集助手</span>' +
      '    <span id="gdshell-brand-toggle-frame"><img id="gdshell-brand-toggle" src="' + BRAND_TOGGLE_ICON + '" alt=""></span>' +
      '  </div>' +
      '  <nav id="gdshell-tabs" role="tablist" aria-label="助手场景"></nav>' +
      '  <button id="gdshell-exit" type="button">退出插件</button>' +
      '</aside>' +
      '<section id="gdshell-workspace">' +
      '  <main id="gdshell-content"></main>' +
      '</section>';

    document.body.appendChild(ui.button);
    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.drawer);
    ui.tabs = ui.drawer.querySelector('#gdshell-tabs');
    ui.content = ui.drawer.querySelector('#gdshell-content');
    ui.button.onclick = openShell;
    ui.overlay.onclick = closeShell;
    ui.drawer.querySelector('#gdshell-exit').onclick = closeShell;
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeShell(); });

    hub.getScenes().forEach(addScene);
    hub.subscribe(addScene);
    handleRoute(location.pathname);
  }

  function ready(callback) {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  }

  ready(function () {
    createUI();
    if (typeof GD !== 'undefined' && typeof GD.on === 'function') {
      GD.on('gd-route-change', function (params) { handleRoute(params && params.pathname); });
    } else {
      window.addEventListener('popstate', function () { handleRoute(location.pathname); });
    }
  });
})();
