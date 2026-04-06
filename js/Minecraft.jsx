} else {
                let aiTargetX = 600; 
                let aiShouldJump = false;
                let aiTryBlock = false;
                let aiTrySpike = false;

                if (!state.isServing) {
                    if (state.ball.x > state.net.x) {
                        aiTargetX = state.ball.x + 25; 
                        if (Math.abs(state.ball.x - state.opponent.x) < 80 && state.ball.y > 50 && state.ball.y < 280) {
                            aiShouldJump = true;
                        }
                        if (state.opponent.y < state.groundY - 10 && state.ball.x < state.opponent.x + 15 && state.opponent.x - state.ball.x < 70 && state.ball.y < state.opponent.y + 10 && state.ball.y > state.opponent.y - 70) {
                            aiTrySpike = true;
                        }
                    } else {
                        // ✨ 修復：當球在左半場但正朝右飛時，村民需提早預判往前站
                        if (state.ball.vx > 0) {
                            if (state.ball.vx > 3 && state.ball.y < 220) {
                                aiTargetX = state.net.x + 35;
                                if (state.ball.x > state.net.x - 120) { aiShouldJump = true; aiTryBlock = true; }
                            } else {
                                aiTargetX = state.net.x + 100 + (state.ball.vx * 15); // 根據球速提早戒備
                            }
                        } else {
                            aiTargetX = 600;
                        }
                    }
                } else {
                     if (state.serving === 'opponent') {
                         aiTargetX = state.ball.x + 25; 
                         if (Math.abs(state.opponent.x - aiTargetX) < 20) {
                             aiShouldJump = true;
                             if (state.opponent.y >= state.groundY) state.opponent.vx = -state.opponent.speed;
                         }
                     } else if (state.serving === 'player') {
                         // ✨ 修復：玩家發球時，村民保持在中間偏前的位置警戒
                         aiTargetX = 550;
                     }
                }
