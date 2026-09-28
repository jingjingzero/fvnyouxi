/**
 * English Language Pack
 * 
 * 英文翻译：与 zh-CN.js 的 key 一一对应
 * 没有翻译的 key 会 fallback 到中文
 */

export default {
  // ========== Common ==========
  common: {
    continue: "Continue",
    goodbye: "Farewell",
    chat: "Chat",
    gift: "Give Gift",
    ask: "Ask",
    next: "Next",
    back: "Back",
    help: "View Guide",
  },

  // ========== NPC: Jingling (Spirit) ==========
  npc_jingling: {
    // Greetings
    greeting_stranger: "Hello there.",
    greeting_familiar: "Hi, you're back.",
    greeting_friendly: "Good to see you!",
    greeting_close: "Welcome! I was just thinking of you.",
    
    // Chat intro
    chat_intro_low: "The spirit keeps a wary distance and quietly watches you.",
    chat_intro_high: "The spirit greets you warmly, happy to see you again.",
    
    // Chat options
    opt_chat: "Chat",
    opt_gift: "Give a gift",
    opt_ask_forest: "Ask about the forest",
    opt_daily: "Ask about daily life",
    opt_place: "Ask about this place",
    opt_like: "Ask what he likes",
    opt_nothing: "Nothing, just passing by",
    opt_chat_more: "Chat more",
    opt_next_time: "Another time",
    
    // Chat content
    chat_daily: "I take care of the trees and plants every day, keeping everyone fed and safe.",
    chat_place: "This camp is our home. The Boundary Tree protects us from the monsters.",
    chat_like: "I like quiet places, and a peaceful sky with no monsters around.",
    chat_more: "There's still so much I want to learn about this world.",
    
    // Gifts
    gift_intro: "A gift? For me? You really are a kind one.",
    opt_gift_flower: "Give a flower",
    opt_gift_stone: "Give a shiny stone",
    opt_gift_later: "Not now",
    gift_flower: "A flower... it smells lovely. Thank you.",
    gift_stone: "A shiny stone! It sparkles just like the stars. Thank you.",
    
    // Forest related
    forest_intro: "The forest is beautiful, but danger lurks behind every shadow.",
    opt_forest_danger: "Ask about the dangers",
    opt_forest_stay: "Stay at the camp",
    forest_danger: "Deep in the forest, monsters grow stronger as night falls. Never go there alone.",
    forest_stay: "It's safer here by the Boundary Tree. As long as its light shines, we have nothing to fear.",
    
    // Goodbye
    bye_stranger: "Take care.",
    bye_familiar: "See you later.",
    bye_close: "Come back soon, I'll be waiting.",
    
    // First meet
    first_meet_alert: "A stranger has entered the camp!",
    first_meet_opt_staff: "Show the staff",
    first_meet_opt_passby: "Just passing by",
    first_meet_opt_friendly: "Wave a friendly hello",
    first_meet_staff_angry: "The spirit tenses up at the sight of the staff, baring its claws.",
    first_meet_passby_suspicious: "The spirit narrows its eyes, still watching you cautiously.",
    first_meet_friendly_surprised: "The spirit is startled by your friendliness, then slowly relaxes.",
    first_meet_end: "You've taken the first step toward becoming friends.",
  },

  // ========== Example: Intro ==========
  intro: {
    start_text: "Hello, welcome to the Sky Facility! What would you like to do?",
    opt_explore: "Explore the lab",
    opt_rest: "Take a rest",
    
    explore_text_low: "You start exploring the lab, but the spirit looks wary and watches you from a distance.",
    explore_text_high: "You walk into the lab full of curiosity. The spirit is friendly and eagerly introduces you to the equipment here.",
    opt_continue_deep: "Go deeper",
    opt_go_back_rest: "Go back and rest",
    
    rest_text: "You find a spot to sit and rest, recovering some energy.",
    rest_continue_text: "Rest complete. You feel much better now.",
    opt_continue_adventure: "Continue the adventure",
    opt_rest_more: "Rest a bit more",
    rest_more_text: "You sit for a while longer. Time slips by quietly, but you also miss out on some chances to explore.",
    
    find_room_text: "Deep in the lab, you find a mysterious door with a sign that reads: No Entry.",
    opt_open_door: "Open the door and go in",
    opt_ignore: "Leave it alone",
    
    secret_room_text: "You unlock the door with a key. Inside is a secret lab, full of strange instruments and documents...",
    
    continue_explore_text: "You decide to leave that door alone and keep exploring other areas.",
    
    find_item_text: "On the workbench, you find a bottle of potion that looks very precious.",
    opt_take_potion: "Take the potion",
    opt_put_back: "Put it back",
    take_potion_text: "You put the potion into your backpack.",
    
    rest_room_text: "You return to the rest area, which has comfortable sofas and an automatic coffee machine.",
    
    leave_lab_text: "It's time to leave the lab. Today's exploration was quite fruitful.",
    
    end_text: "Dialogue ended.",
  },
};
