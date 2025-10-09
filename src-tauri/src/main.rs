// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, Manager, WindowBuilder, WindowUrl};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
struct FCMNotification {
    title: String,
    body: String,
    data: HashMap<String, String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct FCMMessage {
    notification: FCMNotification,
    data: HashMap<String, String>,
}

fn main() {
  // 시스템 트레이 메뉴 생성
  let quit = CustomMenuItem::new("quit".to_string(), "종료");
  let show = CustomMenuItem::new("show".to_string(), "앱 보이기");
  let hide = CustomMenuItem::new("hide".to_string(), "앱 숨기기");
  
  let tray_menu = SystemTrayMenu::new()
    .add_item(show)
    .add_item(hide)
    .add_native_item(tauri::SystemTrayMenuItem::Separator)
    .add_item(quit);

  let system_tray = SystemTray::new().with_menu(tray_menu);

  tauri::Builder::default()
    .system_tray(system_tray)
    .invoke_handler(tauri::generate_handler![show_notification, handle_fcm_message])
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::LeftClick {
        position: _,
        size: _,
        ..
      } => {
        // 시스템 트레이 아이콘 클릭 시 앱 표시
        let window = app.get_window("main").unwrap();
        window.show().unwrap();
        window.set_focus().unwrap();
      }
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "quit" => {
            std::process::exit(0);
          }
          "show" => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
          }
          "hide" => {
            let window = app.get_window("main").unwrap();
            window.hide().unwrap();
          }
          _ => {}
        }
      }
      _ => {}
    })
    .on_window_event(|event| match event.event() {
      tauri::WindowEvent::CloseRequested { api, .. } => {
        // 윈도우 닫기 시 시스템 트레이로 숨기기
        event.window().hide().unwrap();
        api.prevent_close();
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// 알림 표시 커맨드
#[tauri::command]
fn show_notification(
    app_handle: tauri::AppHandle,
    title: String,
    body: String,
    sender_name: String,
    sender_avatar: Option<String>
) -> Result<(), String> {
    // 알림 윈도우 생성 (매번 새로 생성)
    let notification_window = WindowBuilder::new(
        &app_handle,
        &format!("notification-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()),
        WindowUrl::External("http://localhost:3000/notification.html".parse().unwrap())
    )
    .title("알림")
    .inner_size(380.0, 100.0)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .build()
    .map_err(|e| format!("Failed to create notification window: {}", e))?;

    // 알림 데이터를 프론트엔드로 전송
    notification_window
        .emit("new_notification", serde_json::json!({
            "title": title,
            "body": body,
            "sender_name": sender_name,
            "sender_avatar": sender_avatar
        }))
        .map_err(|e| format!("Failed to emit notification event: {}", e))?;

    // 윈도우 위치 설정 (우측 하단 구석에 완전히 붙임)
    let screen_size = notification_window.outer_size().unwrap_or(tauri::PhysicalSize::new(1920, 1080));
    let window_size = notification_window.outer_size().unwrap_or(tauri::PhysicalSize::new(380, 120));
    
    // 우측 하단 구석에 완전히 붙임 (마진 없음)
    let x = (screen_size.width - window_size.width) as i32;
    let y = (screen_size.height - window_size.height) as i32;
    
    notification_window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    // 윈도우 표시
    notification_window
        .show()
        .map_err(|e| format!("Failed to show notification window: {}", e))?;

    // 5초 후 자동 닫기
    let window_clone = notification_window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(5));
        let _ = window_clone.hide();
    });

    Ok(())
}

// FCM 메시지 수신 처리 (올바른 흐름)
#[tauri::command]
async fn handle_fcm_message(
    app_handle: tauri::AppHandle,
    message: FCMMessage
) -> Result<(), String> {
    println!("🔔 [Rust] FCM 메시지 수신: {:?}", message);
    
    // 메인 윈도우에 알림 데이터 emit
    if let Some(main_window) = app_handle.get_window("main") {
        let notification_data = serde_json::json!({
            "title": message.notification.title,
            "body": message.notification.body,
            "sender_name": message.data.get("sender_name").unwrap_or(&"시스템".to_string()),
            "sender_avatar": message.data.get("sender_avatar"),
            "type": message.data.get("type").unwrap_or(&"info".to_string()),
            "data": message.data
        });
        
        main_window.emit("fcm_notification_received", notification_data)
            .map_err(|e| format!("Failed to emit FCM notification: {}", e))?;
        
        println!("✅ [Rust] 메인 윈도우로 알림 데이터 emit 완료");
    }
    
    Ok(())
}
