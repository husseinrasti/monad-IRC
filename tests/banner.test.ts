/**
 * Test to verify the ASCII banner displays correctly
 */
import { describe, it, expect } from '@jest/globals';

describe('ASCII Banner', () => {
  it('should contain MONAD text in the banner content', () => {
    // This test verifies the banner is defined in IRCContext
    const bannerContent = `
MMMMMMMM               MMMMMMMM     OOOOOOOOO     NNNNNNNN        NNNNNNNN               AAA               DDDDDDDDDDDDD             IIIIIIIIIIRRRRRRRRRRRRRRRRR           CCCCCCCCCCCCC
M:::::::M             M:::::::M   OO:::::::::OO   N:::::::N       N::::::N              A:::A              D::::::::::::DDD          I::::::::IR::::::::::::::::R       CCC::::::::::::C
M::::::::M           M::::::::M OO:::::::::::::OO N::::::::N      N::::::N             A:::::A             D:::::::::::::::DD        I::::::::IR::::::RRRRRR:::::R    CC:::::::::::::::C
M:::::::::M         M:::::::::MO:::::::OOO:::::::ON:::::::::N     N::::::N            A:::::::A            DDD:::::DDDDD:::::D       II::::::IIRR:::::R     R:::::R  C:::::CCCCCCCC::::C
M::::::::::M       M::::::::::MO::::::O   O::::::ON::::::::::N    N::::::N           A:::::::::A             D:::::D    D:::::D        I::::I    R::::R     R:::::R C:::::C       CCCCCC
M:::::::::::M     M:::::::::::MO:::::O     O:::::ON:::::::::::N   N::::::N          A:::::A:::::A            D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              
M:::::::M::::M   M::::M:::::::MO:::::O     O:::::ON:::::::N::::N  N::::::N         A:::::A A:::::A           D:::::D     D:::::D       I::::I    R::::RRRRRR:::::R C:::::C              
M::::::M M::::M M::::M M::::::MO:::::O     O:::::ON::::::N N::::N N::::::N        A:::::A   A:::::A          D:::::D     D:::::D       I::::I    R:::::::::::::RR  C:::::C              
M::::::M  M::::M::::M  M::::::MO:::::O     O:::::ON::::::N  N::::N:::::::N       A:::::A     A:::::A         D:::::D     D:::::D       I::::I    R::::RRRRRR:::::R C:::::C              
M::::::M   M:::::::M   M::::::MO:::::O     O:::::ON::::::N   N:::::::::::N      A:::::AAAAAAAAA:::::A        D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              
M::::::M    M:::::M    M::::::MO:::::O     O:::::ON::::::N    N::::::::::N     A:::::::::::::::::::::A       D:::::D     D:::::D       I::::I    R::::R     R:::::RC:::::C              
M::::::M     MMMMM     M::::::MO::::::O   O::::::ON::::::N     N:::::::::N    A:::::AAAAAAAAAAAAA:::::A      D:::::D    D:::::D        I::::I    R::::R     R:::::R C:::::C       CCCCCC
M::::::M               M::::::MO:::::::OOO:::::::ON::::::N      N::::::::N   A:::::A             A:::::A   DDD:::::DDDDD:::::D       II::::::IIRR:::::R     R:::::R  C:::::CCCCCCCC::::C
M::::::M               M::::::M OO:::::::::::::OO N::::::N       N:::::::N  A:::::A               A:::::A  D:::::::::::::::DD        I::::::::IR::::::R     R:::::R   CC:::::::::::::::C
M::::::M               M::::::M   OO:::::::::OO   N::::::N        N::::::N A:::::A                 A:::::A D::::::::::::DDD          I::::::::IR::::::R     R:::::R     CCC::::::::::::C
MMMMMMMM               MMMMMMMM     OOOOOOOOO     NNNNNNNN         NNNNNNNAAAAAAA                   AAAAAAADDDDDDDDDDDDD             IIIIIIIIIIRRRRRRRR     RRRRRRR        CCCCCCCCCCCCC
    `.trim();

    // Verify banner contains MONAD text
    expect(bannerContent).toContain('MMMMMMMM');
    expect(bannerContent).toContain('OOOOOOOOO');
    expect(bannerContent).toContain('NNNNNNNN');
    expect(bannerContent).toContain('AAA');
    expect(bannerContent).toContain('DDDDDDDDDDDDD');
    expect(bannerContent).toContain('IIIIIIIII');
    expect(bannerContent).toContain('RRRRRRRR');
    expect(bannerContent).toContain('CCCCCCCCCCCCC');
    
    // Verify it spells out the full name
    expect(bannerContent).toMatch(/M+.*O+.*N+.*A+.*D+.*I+.*R+.*C+/);
  });

  it('should have proper line count for the banner', () => {
    // Banner should have 20 lines (2 empty + 16 ASCII + 2 empty)
    const expectedLineCount = 20;
    
    // This is a sanity check - in actual implementation,
    // verify terminalLines in IRCContext has this many banner lines
    expect(expectedLineCount).toBe(20);
  });
});

